import type {
	Realm,
	DependencyMap
} from "@fourtune/types/core/v1/"

import path from "node:path"
import fs from "node:fs/promises"
import {installDependency} from "./installDependency.mts"
import {calculateDependenciesIntegrity} from "./calculateDependenciesIntegrity.mts"
import {debugPrint} from "./debugPrint.mts"

export async function installRealmDependencies(
	core_base_dir: string,
	realm: Realm,
	dependencies: DependencyMap,
	hash: string,
	npm_bin_path?: string|null
) {
	const tmp = Math.random().toString(32).slice(2)

	const tmp_path = path.join(core_base_dir, `.tmp_${tmp}`)

	await fs.mkdir(tmp_path)

	let file = ``, index = 0

	file += `const dependencies = []\n`
	file += `const realm = ${JSON.stringify(realm)}\n`
	file += `const platform = ${JSON.stringify(`${process.arch + "-" + process.platform}`)}\n`

	for (const dependency_name in dependencies) {
		const dependency = dependencies[dependency_name]

		debugPrint(`installing ${dependency_name}@${dependency.version}`)

		file += await installDependency(
			index, tmp_path, dependency_name, dependency, npm_bin_path
		)

		++index
	}

	file += `\nexport {dependencies, realm, platform};\n`

	await fs.writeFile(
		path.join(tmp_path, "dependencies.mjs"),
		file
	)

	await fs.writeFile(
		path.join(tmp_path, "hash.mjs"),
		`export default ${JSON.stringify(hash)};\n`
	)

	const integrity = await calculateDependenciesIntegrity(
		tmp_path
	)

	debugPrint(`writing integrity '${integrity}'`)

	await fs.rm(path.join(core_base_dir, "dependencies"), {
		recursive: true,
		force: true
	})

	await fs.rename(
		tmp_path,
		path.join(core_base_dir, "dependencies")
	)

	await fs.writeFile(
		path.join(core_base_dir, "dependencies_integrity.mjs"),
		`export default ${JSON.stringify(integrity)};\n`
	)
}
