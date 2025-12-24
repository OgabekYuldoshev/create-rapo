#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cancel, confirm, isCancel, select, text } from "@clack/prompts";
import chalk from "chalk";
import minimist from "minimist";

interface BaseTemplate {
	label: string;
	value: string;
}

interface Template extends BaseTemplate {
	children: BaseTemplate[];
}

const DEFAULT_PROJECT_NAME = "rapo-project";
const GIT_DIRECTORY = ".git";
const TEMPLATES_DIRECTORY = "templates";
const PACKAGE_JSON_FILE = "package.json";

const AVAILABLE_TEMPLATES: Template[] = [
	{
		label: "Vanilla",
		value: "vanilla",
		children: [
			{
				label: "Basic library template",
				value: "vanilla-library",
			},
		],
	},
	{
		label: "React",
		value: "react",
		children: [
			{
				label: "Basic template with Mantine UI",
				value: "react-basic-mantine",
			},
		],
	},
];

function normalizeProjectName(projectName: string): string {
	return projectName
		.trim()
		.toLowerCase()
		.replace(/\s+/g, "-")
		.replace(/^[._]/, "")
		.replace(/[^a-z\d\-~]+/g, "-");
}

function trimTrailingSlashes(directoryPath: string): string {
	return directoryPath.trim().replace(/\/+$/g, "");
}

function isEmptyDirectory(directoryPath: string): boolean {
	if (!fs.existsSync(directoryPath)) {
		return true;
	}
	const files = fs.readdirSync(directoryPath);
	return files.length === 0;
}

function clearDirectory(directoryPath: string): void {
	if (!fs.existsSync(directoryPath)) {
		return;
	}

	const files = fs.readdirSync(directoryPath);
	for (const file of files) {
		if (file === GIT_DIRECTORY) {
			continue;
		}
		fs.rmSync(path.resolve(directoryPath, file), {
			recursive: true,
			force: true,
		});
	}
}

function exitWithCancel(message = "Operation cancelled"): never {
	cancel(message);
	process.exit(0);
}

async function promptProjectName(): Promise<string> {
	const projectName = await text({
		message: "What is the name of your project?",
		placeholder: DEFAULT_PROJECT_NAME,
		defaultValue: DEFAULT_PROJECT_NAME,
	});

	if (isCancel(projectName)) {
		exitWithCancel();
	}

	return normalizeProjectName(String(projectName));
}

async function promptFramework(): Promise<string> {
	const framework = await select({
		message: "What framework do you want to use?",
		options: AVAILABLE_TEMPLATES.map((template) => ({
			label: template.label,
			value: template.value,
		})),
	});

	if (isCancel(framework)) {
		exitWithCancel();
	}

	return String(framework);
}

async function promptTemplate(templates: BaseTemplate[]): Promise<string> {
	const selectedTemplate = await select({
		message: "What template do you want to use?",
		options: templates,
	});

	if (isCancel(selectedTemplate)) {
		exitWithCancel();
	}

	return String(selectedTemplate);
}

async function promptOverwriteDirectory(directoryPath: string): Promise<boolean> {
	const shouldOverwrite = await confirm({
		message: `Directory "${directoryPath}" already exists. Overwrite?`,
		initialValue: true,
	});

	if (isCancel(shouldOverwrite)) {
		exitWithCancel();
	}

	return Boolean(shouldOverwrite);
}

function getTemplateDirectory(templateName: string): string {
	const currentFileUrl = fileURLToPath(import.meta.url);
	return path.resolve(currentFileUrl, "../..", TEMPLATES_DIRECTORY, templateName);
}

function updatePackageJson(projectPath: string, packageName: string): void {
	const packageJsonPath = path.join(projectPath, PACKAGE_JSON_FILE);
	const packageJsonContent = fs.readFileSync(packageJsonPath, "utf-8");
	const packageJson = JSON.parse(packageJsonContent) as { name: string };

	packageJson.name = packageName;

	fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
}

function removeUnderscorePrefix(filename: string): string {
	if (filename.startsWith("_")) {
		return filename.slice(1);
	}
	return filename;
}

function copy(sourcePath: string, destinationPath: string): void {
	if (!fs.existsSync(destinationPath)) {
		fs.mkdirSync(destinationPath, { recursive: true });
	}

	const entries = fs.readdirSync(sourcePath, { withFileTypes: true });

	for (const entry of entries) {
		const sourceEntryPath = path.join(sourcePath, entry.name);
		const destinationEntryName = removeUnderscorePrefix(entry.name);
		const destinationEntryPath = path.join(destinationPath, destinationEntryName);

		if (entry.isDirectory()) {
			copy(sourceEntryPath, destinationEntryPath);
		} else {
			fs.copyFileSync(sourceEntryPath, destinationEntryPath);
		}
	}
}

async function main(): Promise<void> {
	const args = minimist(process.argv.slice(2));

	const currentWorkingDirectory = process.cwd();

	let projectDirectory: string;
	if (args._[0]) {
		projectDirectory = trimTrailingSlashes(String(args._[0]));
	} else {
		projectDirectory = await promptProjectName();
	}

	const projectPath = path.resolve(currentWorkingDirectory, projectDirectory);
	if (fs.existsSync(projectPath) && !isEmptyDirectory(projectPath)) {
		const shouldOverwrite = await promptOverwriteDirectory(projectDirectory);
		if (shouldOverwrite) {
			clearDirectory(projectPath);
		} else {
			exitWithCancel();
		}
	}

	const selectedFramework = await promptFramework();
	const frameworkTemplate = AVAILABLE_TEMPLATES.find((template) => template.value === selectedFramework);

	if (!frameworkTemplate) {
		exitWithCancel("Invalid framework selected");
	}

	const selectedTemplate = await promptTemplate(frameworkTemplate.children);

	const templateDirectory = getTemplateDirectory(selectedTemplate);
	if (!fs.existsSync(templateDirectory)) {
		exitWithCancel("Template not found");
	}

	copy(templateDirectory, projectPath);

	const packageName = normalizeProjectName(path.basename(path.resolve(projectDirectory)));
	updatePackageJson(projectPath, packageName);

	console.log(
		`\n${chalk.green("✓")} ${chalk.bold.green("Project created successfully!")}\n` +
			`${chalk.gray("→")} ${chalk.cyan.bold(projectDirectory)}\n` +
			`\n${chalk.dim("Next steps:")}\n` +
			`  ${chalk.dim("cd")} ${chalk.cyan(projectDirectory)}\n` +
			`  ${chalk.dim("pnpm install")}\n` +
			`  ${chalk.dim("pnpm dev")}\n`,
	);
}

main().catch((error) => {
	console.error("An error occurred:", error);
	process.exit(1);
});
