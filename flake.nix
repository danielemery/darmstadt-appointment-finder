{
  description = "Dev shell for darmstadt-appointment-finder";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs =
    { self, nixpkgs }:
    let
      forAllSystems =
        f:
        nixpkgs.lib.genAttrs [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ] (
          system: f nixpkgs.legacyPackages.${system}
        );
    in
    {
      devShells = forAllSystems (
        pkgs:
        let
          tooling = [
            pkgs.nodejs_24
            # Biome comes from nixpkgs, not npm: the npm-shipped binary is
            # dynamically linked and cannot run on NixOS. Keep biome.json's
            # $schema version in sync with this package's version.
            pkgs.biome
          ];
        in
        {
          default = pkgs.mkShell {
            packages = tooling;

            # Playwright browsers come from nixpkgs, not `npx playwright install`.
            # The playwright version in package.json must stay pinned to the
            # exact version of pkgs.playwright-driver (exposed below as
            # PLAYWRIGHT_DRIVER_VERSION) or browser lookup fails at runtime.
            PLAYWRIGHT_BROWSERS_PATH = pkgs.playwright-driver.browsers;
            PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS = "true";
            PLAYWRIGHT_DRIVER_VERSION = pkgs.playwright-driver.version;
          };

          # Same toolchain without the Playwright browsers closure — CI's
          # `npm run verify` (build + lint) never launches a browser, and the
          # browsers add ~1 GB to the shell.
          ci = pkgs.mkShell {
            packages = tooling;
          };
        }
      );
    };
}
