#!/usr/bin/env node
import { runCli } from "@cms-lab/cli";

const exitCode = await runCli(process.argv.slice(2));
process.exitCode = exitCode;
