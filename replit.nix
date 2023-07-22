{ pkgs }: {
    deps = [
        pkgs.yarn
        pkgs.esbuild
        pkgs.nodejs-18_x

        pkgs.miniserve
        pkgs.bun
        pkgs.time
    ];
}