const { execFileSync, spawnSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const androidRoot = path.join(__dirname, "..", "android");
const propsPath = path.join(androidRoot, "keystore.properties");
const storePath = path.join(androidRoot, "agdeskpro-release.keystore");

function findKeytool() {
  const lookup = process.platform === "win32" ? "where" : "which";
  const fromPath = spawnSync(lookup, ["keytool"], { encoding: "utf8" });
  if (fromPath.status === 0) {
    const first = fromPath.stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean);
    if (first) return first;
  }

  const home = process.env.HOME || process.env.USERPROFILE || "";
  const candidates = [
    "/Applications/Android Studio.app/Contents/jbr/Contents/Home/bin/keytool",
    path.join(home, "Applications/Android Studio.app/Contents/jbr/Contents/Home/bin/keytool"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  throw new Error(
    "keytool not found. On the Mac, keep Android Studio installed and run this from that machine.",
  );
}

if (!fs.existsSync(propsPath) || !fs.existsSync(storePath)) {
  const pass = crypto.randomBytes(16).toString("hex");
  execFileSync(
    findKeytool(),
    [
      "-genkeypair",
      "-v",
      "-keystore",
      storePath,
      "-alias",
      "agdeskpro",
      "-keyalg",
      "RSA",
      "-keysize",
      "2048",
      "-validity",
      "10000",
      "-storepass",
      pass,
      "-keypass",
      pass,
      "-dname",
      "CN=AG Desk Pro, OU=American Irrigation, O=American Irrigation, L=Americus, ST=Georgia, C=US",
    ],
    { stdio: "inherit" },
  );
  fs.writeFileSync(
    propsPath,
    [
      "storeFile=agdeskpro-release.keystore",
      `storePassword=${pass}`,
      "keyAlias=agdeskpro",
      `keyPassword=${pass}`,
      "",
    ].join("\n"),
  );
  console.log(
    "Created the release keystore. Back up android/agdeskpro-release.keystore and android/keystore.properties. Losing them means Play Store updates cannot be signed.",
  );
}

const gradleArgs = ["assembleRelease", "bundleRelease"];
if (process.platform === "win32") {
  execFileSync("gradlew.bat", gradleArgs, {
    cwd: androidRoot,
    stdio: "inherit",
    shell: true,
  });
} else {
  const gradlewPath = path.join(androidRoot, "gradlew");
  try {
    fs.chmodSync(gradlewPath, 0o755);
  } catch {
    // Windows checkouts often lose the executable bit; run through sh instead.
  }
  execFileSync("sh", [gradlewPath, ...gradleArgs], {
    cwd: androidRoot,
    stdio: "inherit",
  });
}

const apk = path.join(androidRoot, "app/build/outputs/apk/release/app-release.apk");
const aab = path.join(androidRoot, "app/build/outputs/bundle/release/app-release.aab");
console.log(`Signed APK (phone install): ${apk}`);
console.log(`Signed AAB (Play Store): ${aab}`);
