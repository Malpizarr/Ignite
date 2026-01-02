VSCE = npx vsce
CODE = code
VSIX = ignite-0.0.2.vsix

install:
	$(CODE) --install-extension $(VSIX) --force

dev:
	npm install
	npm run compile
	$(VSCE) package
	$(MAKE) install
