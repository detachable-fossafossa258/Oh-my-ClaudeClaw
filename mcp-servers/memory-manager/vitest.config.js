import { defineConfig } from "vitest/config";
import path from "path";
import os from "os";

export default defineConfig({
  test: {
    env: {
      MEMORY_ROOT: path.join(os.tmpdir(), "openclaw-cc-test"),
    },
    fileParallelism: false,
  },
});
