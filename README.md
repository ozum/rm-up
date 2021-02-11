# rm-up

Delete files or empty directories and their empty parents from bottom to up.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Synopsis](#synopsis)
- [Safety](#safety)
- [Details](#details)
- [API](#api)
- [rm-up](#rm-up)
  - [Table of contents](#table-of-contents)
    - [Interfaces](#interfaces)
    - [Functions](#functions)
  - [Functions](#functions-1)
    - [default](#default)
- [Interfaces](#interfaces-1)
- [Interface: Options](#interface-options)
  - [Hierarchy](#hierarchy)
  - [Table of contents](#table-of-contents-1)
    - [Properties](#properties)
  - [Properties](#properties-1)
    - [cwd](#cwd)
    - [deleteInitial](#deleteinitial)
    - [dry](#dry)
    - [force](#force)
    - [relative](#relative)
    - [stop](#stop)
    - [verbose](#verbose)
- [Related](#related)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Synopsis

```ts
import rmUp from "rm-up";

await rmUp("generated/template/db/ddl");

await rmUp(["generated/lib/math", "generated/util/helper"], { cwd: "/path/to/project", stop: "." });
```

# Safety

`rm-up` deletes only files below the `options.stop` to prevent unintentional delete operations. If the `options.stop` is not provided `rm-up` deletes empty directories up to root.

For example:

- `await rmUp("/root/a/b/c", { stop: "root/x" }); // nothing would be deleted.`
- `await rmUp("/root/a/b/c", { stop: "root/a" }); // "b" and "c" deleted if empty.`

# Details

`rmUp` function deletes files or empty directories and their empty parents from bottom to up.
First deletes given files or directories, then checks whether their parent directories are empty and deletes them if empty.
Then checks parent's parents and so on.

It's direction is reverse of `rm -rf` or `deltree` command.

Ignores system junk files such as `.DS_Store` and `Thumbs.db`.

For CLI, please see [rm-up-cli](https://github.com/ozum/rm-up-cli).

**Why do I need this?**

It is most useful when you create a file in a deep path programmatically and want to delete whole created tree, but not sure if other files are added somewhere between by others.

For example you created "`generated/template/db/ddl/create.sql`" in your project "`/path/to/project`" and want to delete whole created tree.

**Example 1**

```ts
await rmUp("generated/template/db/ddl/create.sql", { cwd: "/path/to/project" });
```

<pre>
project                      project                        project
└─generated/                 <s>└─generated/</s>
  └─template/                  <s>└─template/</s>
    └─db/           --▶          <s>└─db/</s>            --▶
      └─ddl/                       <s>└─ddl/</s>
        └─create.sql                 <s>└─create.sql</s>
</pre>

`create.sql` file would be deleted, `ddl` become empty and deleted, `db` become empty and deleted, so `template` and `generated` directories are deleted likewise.

**Example 2**

Same options for a little different directory tree:

```ts
await rmUp("generated/template/db/ddl/create.sql", { cwd: "/path/to/project" });
```

<pre>
project                      project                        project
└─generated/                 └─generated/                   ├─generated/
  ├─assets/                    ├─assets/                    └─assets/
  └─template/        --▶       <s>└─template/</s>        --▶
    └─db/                        <s>└─db/</s>
      └─ddl/                       <s>└─ddl/</s>
        └─create.sql                 <s>└─create.sql</s>
</pre>

`create.sql` file would be deleted, `ddl` become empty and deleted, `db` become empty and deleted, `template` become empty and deleted, but this time `generated` directory not become empty because of `assets` and **not deleted**.

<!-- usage -->

<!-- commands -->

# API

<a name="readmemd"></a>

rm-up

# rm-up

## Table of contents

### Interfaces

- [Options](#interfacesoptionsmd)

### Functions

- [default](#default)

## Functions

### default

▸ **default**(`paths`: _string_ \| _string_[], `__namedParameters?`: [_Options_](#interfacesoptionsmd)): _Promise_<_string_[]\>

Delete files or empty directories and their empty parents up to `stop` path excluding `stop` path.

#### Parameters:

• **paths**: _string_ \| _string_[]

are the list of directories to be deleted with their empty parents. All paths must be under the same root. (e.g. you can not mix `C:` and `D:` in Windows)

• **\_\_namedParameters**: [_Options_](#interfacesoptionsmd)

**Returns:** _Promise_<_string_[]\>

Defined in: [main.ts:29](https://github.com/ozum/rm-up/blob/5641960/src/main.ts#L29)

# Interfaces

<a name="interfacesoptionsmd"></a>

[rm-up](#readmemd) / Options

# Interface: Options

Options

## Hierarchy

- **Options**

## Table of contents

### Properties

- [cwd](#cwd)
- [deleteInitial](#deleteinitial)
- [dry](#dry)
- [force](#force)
- [relative](#relative)
- [stop](#stop)
- [verbose](#verbose)

## Properties

### cwd

• `Optional` **cwd**: _undefined_ \| _string_

Current working directory to be used with relative input paths.

Defined in: [main.ts:8](https://github.com/ozum/rm-up/blob/5641960/src/main.ts#L8)

---

### deleteInitial

• `Optional` **deleteInitial**: _undefined_ \| _boolean_

Delete target path (bottom directory) even it is non-empty directory. For example even if `c` directory of `a/b/c` has some files in it, `c` will be deleted.

Defined in: [main.ts:14](https://github.com/ozum/rm-up/blob/5641960/src/main.ts#L14)

---

### dry

• `Optional` **dry**: _undefined_ \| _boolean_

Dry run without deleting any files.

Defined in: [main.ts:16](https://github.com/ozum/rm-up/blob/5641960/src/main.ts#L16)

---

### force

• `Optional` **force**: _undefined_ \| _boolean_

If true, no error is thrown if input path is not a directory or does not exists. CWD is used by default.

Defined in: [main.ts:12](https://github.com/ozum/rm-up/blob/5641960/src/main.ts#L12)

---

### relative

• `Optional` **relative**: _undefined_ \| _boolean_

If true returns paths are relative to cwd, otherwise absolute paths.

Defined in: [main.ts:20](https://github.com/ozum/rm-up/blob/5641960/src/main.ts#L20)

---

### stop

• `Optional` **stop**: _undefined_ \| _string_

Path to stop searching empty directories up. Stop directory is not included (not deleted).

Defined in: [main.ts:10](https://github.com/ozum/rm-up/blob/5641960/src/main.ts#L10)

---

### verbose

• `Optional` **verbose**: _undefined_ \| _boolean_

If true returns all deleted directories and files. Otherwise returns only paths which delete command is executed agains.

Defined in: [main.ts:18](https://github.com/ozum/rm-up/blob/5641960/src/main.ts#L18)

# Related

- [rm-up-cli](https://github.com/ozum/rm-up-cli): CLI for this API.
