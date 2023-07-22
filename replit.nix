{ pkgs }: {
    deps = [
        pkgs.esbuild
        pkgs.nodejs-18_x

        pkgs.miniserve
        pkgs.time
    ];
}