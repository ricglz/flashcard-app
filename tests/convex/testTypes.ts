import { convexTest } from "convex-test";
import schema from "../../convex/schema";

function _testDbType() {
  const modules = import.meta.glob("../../convex/**/*.ts");
  return convexTest(schema, modules);
}

export type TestDb = ReturnType<typeof _testDbType>;
export type TestIdentity = ReturnType<TestDb["withIdentity"]>;
