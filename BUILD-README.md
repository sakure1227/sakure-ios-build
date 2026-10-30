# Sakure iOS 构建源码包

这是**只含 iOS 构建所需内容**的源码（从完整仓库里精简出来的）。

## 怎么构建

```bash
npm ci
node mobile/build-mobile.mjs      # 构建渲染层
npx cap sync ios                   # 同步进 iOS 工程
node scripts/ios/sync-ios-plugins.mjs   # 同步三个原生插件（关键，别漏）
node scripts/ios/check-xcode-project.mjs  # 校验工程结构
xcodebuild -project ios/App/App.xcodeproj -scheme App \
  -configuration Release -sdk iphoneos \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY= build
```

产出的 .app 收成未签名 IPA：

```bash
mkdir -p Payload && cp -R <产物>/App.app Payload/
zip -qry Sakure.ipa Payload
```

## 少了什么

整仓库里的 `node_modules`、`build/`、`release/`、`models/`、`dist*`、
`android/` 都没打包 —— 它们跟 iOS 构建无关（构建产物、桌面端资源、
Android 工程）。云端会自己 `npm ci`。
