#!/usr/bin/env node
import { text } from "@clack/prompts";
import minimist from "minimist";

async function main() {
  const args = minimist(process.argv.slice(2));
  console.log(args);
  const projectNamePrompt = await text({
    message: "What is the name of your project?",
    placeholder: "rapo-project",
  });

  console.log(projectNamePrompt);
}

main();
