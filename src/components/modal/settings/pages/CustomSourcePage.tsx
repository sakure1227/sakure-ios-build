import React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Puzzle } from 'lucide-react';
import {
    isCustomSourceAvailable,
    listCustomSources,
    importCustomSource,
    importCustomSourceFromUrl,
    removeCustomSources,
    setCustomSourceEnabled,
    setCustomSourceAllowUpdateAlert,
    openCustomSourceDevTools,
    openCustomSourceHomepage,
    testCustomSource,
} from '../../../../services/customSource/customSourceService';
import type { CustomSourceEntry } from '../../../../services/customSource/types';
import { Button, Group, Row, Status, TextField, Toggle, option, type SettingsGroupDef, type SettingsOptionDef } from '../kit';

// src/components/modal/settings/pages/CustomSourcePage.tsx
// The 自定义源 page (desktop app only): the LX Music custom sources the user has imported.
//
// A custom source supplements a built-in provider: it can hand out a playback address, lyrics or
// a cover for a song a provider already found. It cannot search - the protocol has no search
// action - so nothing here changes how songs are found, only what can be played once found.

const IMPORTS: SettingsGroupDef = { id: 'customSourceImport', titleKey: 'customSource.importGroup', electronOnly: true };
const LIST: SettingsGroupDef = { id: 'customSourceList', titleKey: 'customSource.listGroup', electronOnly: true };

const O = {
    import: option(IMPORTS, 'customSourceImport', 'customSource.import'),
    importUrl: option(IMPORTS, 'customSourceImportUrl', 'customSource.importFromUrl'),
    list: option(LIST, 'customSourceList', 'customSource.list'),
};

export const OPTIONS: SettingsOptionDef[] = Object.values(O);

/** The LX Music platform ids a source may declare, and the i18n key each one's name is under. */
const PLATFORM_LABEL_KEYS = {
    kw: 'customSource.platformKw',
    kg: 'customSource.platformKg',
    tx: 'customSource.platformTx',
    wy: 'customSource.platformWy',
    mg: 'customSource.platformMg',
    local: 'customSource.platformLocal',
} as const;

/** The three actions the protocol defines, and the i18n key each one's name is under. */
const ACTION_LABEL_KEYS = {
    musicUrl: 'customSource.actionMusicUrl',
    lyric: 'customSource.actionLyric',
    pic: 'customSource.actionPic',
} as const;

/**
 * What the source says it can do, in one line: the platforms it serves and, for each, the actions.
 *
 * A source that has not declared its capabilities yet has nothing to show.
 */
const describeCapabilities = (
    source: CustomSourceEntry,
    t: (key: string) => string,
): string | undefined => {
    if (!source.sources) return undefined;
    const parts = Object.entries(source.sources).map(([platform, capability]) => {
        const platformName = t(PLATFORM_LABEL_KEYS[platform as keyof typeof PLATFORM_LABEL_KEYS] ?? platform);
        const actions = capability.actions
            .map(action => t(ACTION_LABEL_KEYS[action] ?? action))
            .join('、');
        return actions ? `${platformName}（${actions}）` : platformName;
    });
    return parts.length > 0 ? parts.join('、') : undefined;
};

const CustomSourcePage: React.FC = () => {
    const { t } = useTranslation();
    const available = isCustomSourceAvailable();
    const [sources, setSources] = useState<CustomSourceEntry[]>([]);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [url, setUrl] = useState('');
    const [testing, setTesting] = useState<string | null>(null);
    /** 每个源最近一次测试的结果：源自己的事，就放在源自己身上。 */
    const [testResults, setTestResults] = useState<Record<string, { ok: boolean; reason: string | null }>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);

    const refresh = useCallback(async () => {
        if (!available) return;
        try {
            setSources(await listCustomSources());
        } catch (err) {
            console.error('[CustomSource] Reading the source list failed', err);
        }
    }, [available]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    /** Imports a script the user picked as a file. */
    const handleFile = useCallback(async (file: File) => {
        setBusy(true);
        setError(null);
        setMessage(null);
        try {
            const text = await file.text();
            const entry = await importCustomSource(text);
            setMessage(t('customSource.imported', { name: entry.name }));
            await refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setBusy(false);
        }
    }, [refresh, t]);

    /** Imports a script the user pasted into the box. */
    const handlePaste = useCallback(async (text: string) => {
        setBusy(true);
        setError(null);
        setMessage(null);
        try {
            const entry = await importCustomSource(text);
            setMessage(t('customSource.imported', { name: entry.name }));
            await refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setBusy(false);
        }
    }, [refresh, t]);

    /**
     * Asks one source whether it still answers.
     *
     * The list says a source is "running" when its script started - but a script that started is
     * not the same as a source that answers. These community sources come and go, and their own
     * service can be down while the script itself runs perfectly. Asking is the only way to tell,
     * and the answer is what the user needs before deciding whether to keep the source.
     *
     * The result belongs to the source it is about, so it is kept per source and shown on that
     * source's row - not in one place for the whole page, where it would be about the wrong thing.
     */
    const handleTest = useCallback(async (id: string) => {
        setTesting(id);
        try {
            const result = await testCustomSource(id);
            setTestResults(previous => ({
                ...previous,
                [id]: { ok: result.ok, reason: result.reason },
            }));
        } catch (err) {
            setTestResults(previous => ({
                ...previous,
                [id]: { ok: false, reason: err instanceof Error ? err.message : String(err) },
            }));
        } finally {
            setTesting(null);
        }
    }, []);

    /**
     * Imports a script from a URL the user pasted. The download runs in the main process (see
     * importCustomSourceFromUrl), so the busy state here covers a network round trip, and every
     * failure mode - a bad URL, a dead host, a page instead of a script - arrives as a message
     * from there rather than something this side has to guess at.
     */
    const handleUrlImport = useCallback(async () => {
        setBusy(true);
        setError(null);
        setMessage(null);
        try {
            const entry = await importCustomSourceFromUrl(url);
            setMessage(t('customSource.imported', { name: entry.name }));
            setUrl('');
            await refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setBusy(false);
        }
    }, [refresh, t, url]);

    const handleToggle = useCallback(async (id: string, enabled: boolean) => {
        setError(null);
        try {
            setSources(await setCustomSourceEnabled(id, enabled));
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
            await refresh();
        }
    }, [refresh]);

    const handleRemove = useCallback(async (id: string) => {
        setError(null);
        try {
            setSources(await removeCustomSources([id]));
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
            await refresh();
        }
    }, [refresh]);

    const handleAllowUpdateAlert = useCallback(async (id: string, allow: boolean) => {
        setError(null);
        try {
            setSources(await setCustomSourceAllowUpdateAlert(id, allow));
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        }
    }, []);

    if (!available) {
        return (
            <Group def={IMPORTS}>
                <Row option={O.import} hint={t('customSource.desktopOnly')}>
                    <Status>{t('customSource.unavailable')}</Status>
                </Row>
            </Group>
        );
    }

    return (
        <>
            <Group def={IMPORTS}>
                <Row
                    option={O.import}
                    hint={t('customSource.importHint')}
                    note={t('customSource.importNote')}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".js,.txt"
                        className="hidden"
                        onChange={event => {
                            const file = event.target.files?.[0];
                            event.target.value = '';
                            if (file) void handleFile(file);
                        }}
                    />
                    <button
                        type="button"
                        disabled={busy}
                        className="rounded-lg border border-[color:var(--st-line)] bg-[var(--st-fill)] px-3 py-1.5 text-[12px] font-medium text-[color:var(--st-t1)] transition-colors hover:bg-[var(--st-fill2)] disabled:opacity-50"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {busy ? t('customSource.importing') : t('customSource.import')}
                    </button>
                </Row>
                <Row option={O.importUrl} hint={t('customSource.importUrlHint')}>
                    <div className="flex w-full items-center gap-2">
                        <TextField
                            value={url}
                            onChange={setUrl}
                            onCommit={() => {
                                if (url.trim() && !busy) void handleUrlImport();
                            }}
                            type="url"
                            placeholder={t('customSource.urlPlaceholder')}
                            disabled={busy}
                        />
                        <Button
                            onClick={() => void handleUrlImport()}
                            disabled={busy || !url.trim()}
                        >
                            {busy ? t('customSource.importing') : t('customSource.importFromUrl')}
                        </Button>
                    </div>
                </Row>
                {error ? (
                    <div className="mt-2 rounded-lg border border-[color:var(--st-err)]/25 bg-[color:var(--st-err)]/10 px-3 py-2 text-[12px] text-[color:var(--st-t1)]">
                        {error}
                    </div>
                ) : null}
                {message ? (
                    <div className="mt-2 rounded-lg border border-[color:var(--st-ok)]/25 bg-[color:var(--st-ok)]/10 px-3 py-2 text-[12px] text-[color:var(--st-t1)]">
                        {message}
                    </div>
                ) : null}
            </Group>

            <Group def={LIST}>
                {sources.length === 0 ? (
                    <div className="px-1 py-3 text-[12px] text-[color:var(--st-t3)]">
                        {t('customSource.empty')}
                    </div>
                ) : (
                    sources.map(source => {
                        const capabilities = describeCapabilities(source, t);
                        return (
                        <Row
                            key={source.id}
                            option={{ ...O.list, id: `customSource.${source.id}` }}
                            labelText={source.name}
                            hint={source.description || undefined}
                            note={[
                                source.author ? t('customSource.author', { author: source.author }) : null,
                                capabilities ? t('customSource.capabilities', { capabilities }) : null,
                            ].filter(Boolean).join(' · ') || undefined}
                            below={testResults[source.id] ? (
                                <div className={`rounded-md border px-2 py-1 text-[11px] text-[color:var(--st-t1)] ${
                                    testResults[source.id].ok
                                        ? 'border-[color:var(--st-ok)]/25 bg-[color:var(--st-ok)]/10'
                                        : 'border-[color:var(--st-err)]/25 bg-[color:var(--st-err)]/10'
                                }`}
                                >
                                    {testResults[source.id].ok
                                        ? t('customSource.testOk')
                                        : t('customSource.testFailed', { reason: testResults[source.id].reason ?? '' })}
                                </div>
                            ) : null}
                        >
                            <div className="flex items-center gap-2">
                                <Status tone={source.running ? 'ok' : source.enabled ? 'warn' : undefined}>
                                    {source.running
                                        ? t('customSource.stateRunning')
                                        : source.enabled
                                            ? t('customSource.stateStarting')
                                            : t('customSource.stateOff')}
                                </Status>
                                <Toggle
                                    checked={source.enabled}
                                    onChange={enabled => void handleToggle(source.id, enabled)}
                                />
                                <button
                                    type="button"
                                    title={t('customSource.devTools')}
                                    className="rounded-md p-1.5 text-[color:var(--st-t3)] transition-colors hover:bg-[var(--st-fill)] hover:text-[color:var(--st-t1)]"
                                    onClick={() => void openCustomSourceDevTools(source.id)}
                                >
                                    <Puzzle size={14} />
                                </button>
                                <button
                                    type="button"
                                    title={t('customSource.test')}
                                    disabled={testing === source.id}
                                    className="rounded-md px-2 py-1 text-[11px] text-[color:var(--st-t3)] transition-colors hover:bg-[var(--st-fill)] hover:text-[color:var(--st-t1)] disabled:opacity-50"
                                    onClick={() => void handleTest(source.id)}
                                >
                                    {testing === source.id ? t('customSource.testing') : t('customSource.testAction')}
                                </button>
                                {source.homepage ? (
                                    <button
                                        type="button"
                                        className="rounded-md px-2 py-1 text-[11px] text-[color:var(--st-t3)] transition-colors hover:bg-[var(--st-fill)] hover:text-[color:var(--st-t1)]"
                                        onClick={() => void openCustomSourceHomepage(source.homepage)}
                                    >
                                        {t('customSource.homepage')}
                                    </button>
                                ) : null}
                                <button
                                    type="button"
                                    className="rounded-md px-2 py-1 text-[11px] text-[color:var(--st-err)] transition-colors hover:bg-[var(--st-fill)]"
                                    onClick={() => void handleRemove(source.id)}
                                >
                                    {t('customSource.remove')}
                                </button>
                            </div>
                        </Row>
                        );
                    })
                )}
            </Group>
        </>
    );
};

export default CustomSourcePage;

/** Exported for the command palette: import a script from the clipboard. */
export const importCustomSourceFromClipboard = async (text: string): Promise<CustomSourceEntry> => {
    return importCustomSource(text);
};
