import { readFileSync, writeFileSync } from "node:fs";

const { version: targetVersion } = JSON.parse(
	readFileSync("package.json", "utf8"),
);

// read minAppVersion from manifest.json and bump version to target version
const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const { minAppVersion } = manifest;
if (manifest.version !== targetVersion) {
	manifest.version = targetVersion;
	writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t"));
}

// update versions.json with target version and minAppVersion from manifest.json
const versions = JSON.parse(readFileSync("versions.json", "utf8"));
if (Object.hasOwn(versions, targetVersion)) {
	if (versions[targetVersion] !== minAppVersion) {
		throw new Error(
			`${targetVersion} maps to ${versions[targetVersion]}, expected ${minAppVersion}`,
		);
	}
} else {
	versions[targetVersion] = minAppVersion;
	writeFileSync("versions.json", JSON.stringify(versions, null, "\t"));
}
