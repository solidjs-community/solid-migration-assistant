#!/usr/bin/env node

import { launch } from "../shared/run-workflow.mjs";

process.exitCode = await launch(process.argv.slice(2));
