// 构建后对微信目标产物做静态/渲染回归；不替代微信开发者工具和真机。
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(path.join(root, "package.json"));
const postcss = require("postcss"),
  selectorParser = require("postcss-selector-parser");
const output = path.resolve(root, process.argv[2] || "dist/build/mp-weixin");
assert.ok(fs.existsSync(output), "请先构建微信目标产物");
const violations = [];
let styles = 0;
function scan(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) scan(file);
    else if (file.endsWith(".wxss")) {
      styles++;
      const component = path
        .relative(output, file)
        .startsWith("components" + path.sep);
      postcss
        .parse(fs.readFileSync(file, "utf8"), { from: file })
        .walkRules((rule) =>
          selectorParser((ast) =>
            ast.walk((node) => {
              if (
                node.type === "universal" ||
                (component && ["tag", "id", "attribute"].includes(node.type))
              )
                violations.push(
                  path.relative(output, file) +
                    ":" +
                    rule.source.start.line +
                    " " +
                    rule.selector,
                );
            }),
          ).processSync(rule.selector),
        );
    }
  }
}
scan(output);
assert.deepEqual(violations, [], "微信不兼容选择器");
for (const page of ["find", "feed", "my-meals"]) {
  const wxml = fs.readFileSync(
    path.join(output, "pages", page, "index.wxml"),
    "utf8",
  );
  assert.doesNotMatch(
    wxml,
    /<(?:post-card|meal-card)\b[^>]*\bwx:for=/,
    "先由列表容器遍历，再在参数有效时创建卡片",
  );
}
function component(name) {
  let config;
  const vendor = {
    e: (...values) => Object.assign({}, ...values),
    t: String,
    n: (value) => value,
    o: (fn) => fn,
    _export_sfc: (options, entries) =>
      Object.assign(options, Object.fromEntries(entries)),
  };
  const context = {
    exports: {},
    wx: { createComponent: (options) => (config = options) },
    require: (id) => {
      if (id.includes("vendor")) return vendor;
      if (id.includes("services/time")) return { localTime: () => "测试时间" };
      throw new Error("unexpected import: " + id);
    },
  };
  vm.runInNewContext(
    fs.readFileSync(path.join(output, "components", name + ".js"), "utf8"),
    context,
  );
  assert.ok(config?.render);
  return config;
}
let cases = 0;
for (const [name, key, valid] of [
  [
    "PostCard",
    "post",
    {
      id: 1,
      author: null,
      content: "真实帖子",
      createdAt: "2026-10-22T10:00:00Z",
      meal: null,
    },
  ],
  [
    "MealCard",
    "meal",
    {
      id: 1,
      title: "真实饭局",
      status: "open",
      creator: null,
      currentPeople: 1,
      maxPeople: 2,
      budgetMin: 20,
      budgetMax: 40,
    },
  ],
]) {
  const c = component(name);
  assert.equal(c.props[key].default, null);
  // 组件初次附着、参数到达、参数清空：每一帧都不能读取undefined.author/creator。
  for (const value of [undefined, null, {}, valid, undefined]) {
    const props = { [key]: value },
      ctx = { ...props, $emit: () => {} },
      data = c.data ? c.data() : {},
      options = { ...c.methods };
    if (c.computed?.budget) options.budget = c.computed.budget.call(ctx);
    assert.doesNotThrow(
      () => c.render(ctx, [], props, {}, data, options),
      name + " empty/transition render",
    );
    cases++;
  }
}
console.log(
  JSON.stringify(
    {
      ok: true,
      wxssFiles: styles,
      selectorViolations: violations.length,
      compiledRenderCases: cases,
    },
    null,
    2,
  ),
);
