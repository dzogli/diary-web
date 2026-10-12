// Донастройка проекта Android после "npx cap add android":
// разрешения, подпись, иконки, номер версии. Запускается автоматически в облачной сборке.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const app = path.join(root, 'android', 'app');
const res = path.join(app, 'src', 'main', 'res');

function edit(file, fn) {
  const p = path.join(app, file);
  const before = fs.readFileSync(p, 'utf8');
  const after = fn(before);
  if (after === before) throw new Error('Не удалось изменить ' + file);
  fs.writeFileSync(p, after);
}

// 1. разрешения: микрофон и камера
edit('src/main/AndroidManifest.xml', (t) =>
  t.replace(
    '<uses-permission android:name="android.permission.INTERNET" />',
    [
      '<uses-permission android:name="android.permission.INTERNET" />',
      '    <uses-permission android:name="android.permission.RECORD_AUDIO" />',
      '    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />',
      '    <uses-permission android:name="android.permission.CAMERA" />',
      '    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />',
      '    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />',
      '    <uses-permission android:name="android.permission.VIBRATE" />',
      '    <uses-permission android:name="android.permission.USE_BIOMETRIC" />',
      '    <uses-feature android:name="android.hardware.camera" android:required="false" />',
      '    <uses-feature android:name="android.hardware.microphone" android:required="false" />'
    ].join('\n')
  )
);

// 2. постоянная подпись (чтобы новые версии ставились поверх старой, не теряя записи)
fs.copyFileSync(path.join(root, 'diary.keystore'), path.join(app, 'diary.keystore'));
const run = process.env.GITHUB_RUN_NUMBER || '1';
edit('build.gradle', (t) =>
  t
    .replace('versionCode 1', 'versionCode ' + run)
    .replace('versionName "1.0"', 'versionName "1.0.' + run + '"')
    .replace(
      '    buildTypes {',
      [
        '    lint {',
        '        checkReleaseBuilds false',
        '        abortOnError false',
        '    }',
        '    signingConfigs {',
        '        diary {',
        "            storeFile file('diary.keystore')",
        "            storePassword 'diarydiary'",
        "            keyAlias 'diary'",
        "            keyPassword 'diarydiary'",
        "            storeType 'pkcs12'",
        '        }',
        '    }',
        '    buildTypes {'
      ].join('\n')
    )
    .replace('        release {', '        release {\n            signingConfig signingConfigs.diary')
);

// 3. иконки и заставка
function copyDir(src, dst) {
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src, name);
    const d = path.join(dst, name);
    if (fs.statSync(s).isDirectory()) {
      fs.mkdirSync(d, { recursive: true });
      copyDir(s, d);
    } else if (name !== 'splash-solid.png') {
      fs.copyFileSync(s, d);
    }
  }
}
copyDir(path.join(root, 'android-res'), res);

const splash = path.join(root, 'android-res', 'splash-solid.png');
(function replaceSplash(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) replaceSplash(p);
    else if (name === 'splash.png') fs.copyFileSync(splash, p);
  }
})(res);

const styles = path.join(res, 'values', 'styles.xml');
let st = fs.readFileSync(styles, 'utf8');
st = st.replace(
  '<item name="android:background">@drawable/splash</item>',
  '<item name="android:background">@drawable/splash</item>\n        <item name="windowSplashScreenBackground">@color/ic_launcher_background</item>'
);
st = st.replace(
  '<item name="android:background">@null</item>',
  [
    '<item name="android:background">@null</item>',
    '        <item name="android:statusBarColor">#E2F4E8</item>',
    '        <item name="android:navigationBarColor">#E2F4E8</item>',
    '        <item name="android:windowLightStatusBar">true</item>',
    '        <item name="android:windowLightNavigationBar">true</item>'
  ].join('\n')
);
fs.writeFileSync(styles, st);

console.log('Android project patched, versionCode', run);
