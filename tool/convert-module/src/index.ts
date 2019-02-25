#!/usr/bin/env node

import { join } from 'path';
import { transform } from './transform';

const path = join(process.cwd(), 'libm');
transform(path);
