export function languageFromFilename(filename: string) {
  const file = filename.split("/").pop();

  // Special cases without extensions
  if (file === "Dockerfile") {
    return "dockerfile";
  }

  // Otherwise try to use the extension
  const ext = file?.split(".").pop();
  if (!ext) {
    return "plaintext";
  }

  // TODO: extend this with others we know we'll see
  switch (ext) {
    case "h":
      return "cpp";
    case "cs":
      return "csharp";
    case "js":
    case "jsx":
      return "javascript";
    case "ts":
    case "tsx":
      return "typescript";
    case "yml":
      return "yaml";
    case "kt":
      return "kotlin";
    case "pl":
      return "perl";
    case "m":
    case "mm":
      return "objectivec";
    case "asm":
    case "assembly":
      return "armasm";
    case "rb":
      return "ruby";
    case "rs":
      return "rust";
    case "sh":
    case "shell":
      return "bash";
    case "py":
      return "python";
    default:
      return ext;
  }
}

// All the highlightjs languages we can render in Markdown. I'm mostly
// putting this here to make it easy to remember what's included.
export const languages = [
  "1c",
  "css",
  "hy",
  "nix",
  "scss",
  "abnf",
  "d",
  "index",
  "node-repl",
  "shell",
  "accesslog",
  "dart",
  "inform7",
  "nsis",
  "smali",
  "actionscript",
  "delphi",
  "ini",
  "objectivec",
  "smalltalk",
  "ada",
  "diff",
  "irpf90",
  "ocaml",
  "sml",
  "angelscript",
  "django",
  "isbl",
  "openscad",
  "sqf",
  "apache",
  "dns",
  "java",
  "oxygene",
  "sql",
  "applescript",
  "dockerfile",
  "javascript",
  "parser3",
  "sql_more",
  "arcade",
  "dos",
  "jboss-cli",
  "perl",
  "stan",
  "arduino",
  "dsconfig",
  "json",
  "pf",
  "stata",
  "armasm",
  "dts",
  "julia-repl",
  "pgsql",
  "step21",
  "asciidoc",
  "dust",
  "julia",
  "php-template",
  "stylus",
  "aspectj",
  "ebnf",
  "kotlin",
  "php",
  "subunit",
  "autohotkey",
  "elixir",
  "lasso",
  "plaintext",
  "supported-languages",
  "autoit",
  "elm",
  "latex",
  "pony",
  "swift",
  "avrasm",
  "erb",
  "ldif",
  "powershell",
  "taggerscript",
  "awk",
  "erlang-repl",
  "leaf",
  "processing",
  "tap",
  "axapta",
  "erlang",
  "less",
  "profile",
  "tcl",
  "bash",
  "excel",
  "lisp",
  "prolog",
  "tex",
  "basic",
  "fix",
  "livecodeserver",
  "properties",
  "thrift",
  "bnf",
  "flix",
  "livescript",
  "protobuf",
  "tp",
  "brainfuck",
  "fortran",
  "llvm",
  "puppet",
  "twig",
  "c-like",
  "fsharp",
  "lsl",
  "purebasic",
  "typescript",
  "c",
  "gams",
  "lua",
  "python-repl",
  "vala",
  "cal",
  "gauss",
  "makefile",
  "python",
  "vbnet",
  "capnproto",
  "gcode",
  "markdown",
  "q",
  "vbscript-html",
  "ceylon",
  "gherkin",
  "mathematica",
  "qml",
  "vbscript",
  "clean",
  "glsl",
  "matlab",
  "r",
  "verilog",
  "clojure-repl",
  "gml",
  "maxima",
  "reasonml",
  "vhdl",
  "clojure",
  "go",
  "mel",
  "rib",
  "vim",
  "cmake",
  "golo",
  "mercury",
  "roboconf",
  "x86asm",
  "coffeescript",
  "gradle",
  "mipsasm",
  "routeros",
  "xl",
  "coq",
  "groovy",
  "mizar",
  "rsl",
  "xml",
  "cos",
  "haml",
  "mojolicious",
  "ruby",
  "xquery",
  "cpp",
  "handlebars",
  "monkey",
  "ruleslanguage",
  "yaml",
  "crmsh",
  "haskell",
  "moonscript",
  "rust",
  "zephir",
  "crystal",
  "haxe",
  "n1ql",
  "sas",
  "scala",
  "cs",
  "hsp",
  "nginx",
  "scheme",
  "scilab",
  "csharp",
  "htmlbars",
  "nim",
  "scilab",
  "vhdl",
  "csp",
  "http",
  "nimrod",
  "scilab",
  "xml",
];
