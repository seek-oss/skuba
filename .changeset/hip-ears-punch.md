---
'skuba': patch
---

Jest.mergePreset: Fudge `Node16` and `NodeNext` module resolutions

This works around a `ts-jest` issue where test cases fail to run if your `moduleResolution` is set to a modern mode:

```json
{
  "compilerOptions": {
    "moduleResolution": "Node16 | NodeNext"
  }
}
```

```console
error TS5110: Option 'module' must be set to 'Node16' when option 'moduleResolution' is set to 'Node16'.
error TS5110: Option 'module' must be set to 'NodeNext' when option 'moduleResolution' is set to 'NodeNext'.
```
