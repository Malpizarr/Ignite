VSCE = npx vsce
CODE = code
VSIX = ignite-1.3.2.vsix

install:
	-$(CODE) --uninstall-extension local.ignite || true
	$(CODE) --install-extension $(VSIX) --force

dev:
	npm install
	npm run compile
	$(VSCE) package
	$(MAKE) install
