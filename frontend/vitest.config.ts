import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: [
        "src/shared/api/**/*.ts",
        "src/features/ai-planner/ai-planner-api.ts",
        "src/features/auth/AuthPage.tsx",
        "src/features/auth/lib/**/*.ts",
        "src/features/courses/course-utils.ts",
        "src/features/courses/courses-api.ts",
        "src/features/courses/components/NusModuleSearchBar.tsx",
        "src/features/dashboard/dashboard-grades.ts",
        "src/features/dashboard/dashboard-validation.ts",
        "src/features/popular-choices/image-file.ts",
        "src/features/popular-choices/popularChoicesData.ts",
        "src/features/settings/SettingsPage.tsx",
        "src/features/timetable/timetable-time.ts",
        "src/features/user/UserProfileContext.tsx",
      ],
      exclude: [
        "src/**/*.d.ts",
        "src/**/index.ts",
        "src/shared/types/**",
        "src/test/**",
      ],
      thresholds: {
        branches: 65,
        functions: 75,
        lines: 75,
        statements: 75,
      },
    },
  },
});
