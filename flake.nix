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
      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          packages = [
            pkgs.nodejs_24
          ];

          # Playwright browsers come from nixpkgs, not `npx playwright install`.
          # The playwright version in package.json must stay pinned to the
          # exact version of pkgs.playwright-driver (exposed below as
          # PLAYWRIGHT_DRIVER_VERSION) or browser lookup fails at runtime.
          PLAYWRIGHT_BROWSERS_PATH = pkgs.playwright-driver.browsers;
          PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS = "true";
          PLAYWRIGHT_DRIVER_VERSION = pkgs.playwright-driver.version;
        };
      });
    };
}
