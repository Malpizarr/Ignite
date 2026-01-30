VSCE = npx vsce
CODE = code
VSIX = ignite-1.0.0.vsix

install:
	-$(CODE) --uninstall-extension local.ignite || true
	$(CODE) --install-extension $(VSIX) --force

dev:
	npm install
	npm run compile
	$(VSCE) package
	$(MAKE) install
