# Change Log

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

<a name="1.2.0"></a>
# [1.2.0](https://github.com/Amazebot/bbot/compare/v1.1.0...v1.2.0) (2018-09-04)


### Bug Fixes

* **adapter:** Let adapter be manually assigned before load ([7ee44dd](https://github.com/Amazebot/bbot/commit/7ee44dd))
* **condition:** Match words and trim leading/trailing puncuation ([7e441db](https://github.com/Amazebot/bbot/commit/7e441db))
* **path:** Condition types update ([6daa7fd](https://github.com/Amazebot/bbot/commit/6daa7fd))
* **shell:** Undefined type bug ([4b6eee1](https://github.com/Amazebot/bbot/commit/4b6eee1))


### Features

* **state:** Access user in memory matching message details ([646d2bf](https://github.com/Amazebot/bbot/commit/646d2bf))



<a name="1.1.0"></a>
# [1.1.0](https://github.com/Amazebot/bbot/compare/v1.0.1...v1.1.0) (2018-09-03)


### Bug Fixes

* **adapter:** Inherit settings changes after start ([1464b40](https://github.com/Amazebot/bbot/commit/1464b40))


### Features

* **conditions:** Allow matching on semantic attributes instead of regex ([0b6e785](https://github.com/Amazebot/bbot/commit/0b6e785))
* **payload:** Support rich message actions in adapters ([fba4de6](https://github.com/Amazebot/bbot/commit/fba4de6))



<a name="1.0.1"></a>
## [1.0.1](https://github.com/Amazebot/bbot/compare/v1.0.0...v1.0.1) (2018-08-23)



<a name="1.0.0"></a>
# [1.0.0](https://github.com/Amazebot/bbot/compare/v0.3.0...v1.0.0) (2018-08-23)


### Bug Fixes

* **rocketchat:** Include user name in created user ([12115a9](https://github.com/Amazebot/bbot/commit/12115a9))
* **shell:** Use attachment fallback as message ([f3ffe85](https://github.com/Amazebot/bbot/commit/f3ffe85))
* **state:** Add getter for last branch and envelope ([67d267f](https://github.com/Amazebot/bbot/commit/67d267f))


### Code Refactoring

* New memory, store, middlewares, adapters classes ([2f2d584](https://github.com/Amazebot/bbot/commit/2f2d584)), closes [#96](https://github.com/Amazebot/bbot/issues/96)


### Features

* **payload:** Helpers for attachments and actions ([982efd3](https://github.com/Amazebot/bbot/commit/982efd3)), closes [#24](https://github.com/Amazebot/bbot/issues/24)
* **request:** Add timeout setting for requests ([404b87c](https://github.com/Amazebot/bbot/commit/404b87c)), closes [#96](https://github.com/Amazebot/bbot/issues/96)


### BREAKING CHANGES

* **request:** Request methods now accessed from request instance instead of bot, like
`bot.request.get` instead of `bot.getRequest`
* All methods for interacting with memory, middleware and adpater collections are now
on those class instances instead of the bot. e.g. `bot.get` is now `bot.memory.get`,
`bot.hearMiddleware` is now `bot.middleware.hear`.



<a name="0.3.0"></a>
# [0.3.0](https://github.com/Amazebot/bbot/compare/v0.2.0...v0.3.0) (2018-08-14)


### Features

* **request:** HTTP/s requests with get and post helpers ([7ba1702](https://github.com/Amazebot/bbot/commit/7ba1702)), closes [#13](https://github.com/Amazebot/bbot/issues/13)



<a name="0.2.0"></a>
# [0.2.0](https://github.com/Amazebot/bbot/compare/v0.1.2...v0.2.0) (2018-08-12)


### Bug Fixes

* **config:** Fix adapter loading and config resets ([026fd9a](https://github.com/Amazebot/bbot/commit/026fd9a))
* **config:** Mirror configs with camel case or hyphen ([5cd95e9](https://github.com/Amazebot/bbot/commit/5cd95e9))
* **config:** Settings unset reloads defaults ([b627575](https://github.com/Amazebot/bbot/commit/b627575))
* **core:** Adapter load errors now exit ([2adf38e](https://github.com/Amazebot/bbot/commit/2adf38e)), closes [#92](https://github.com/Amazebot/bbot/issues/92)
* **memory:** merge user data from sequential lookups ([85ee0a2](https://github.com/Amazebot/bbot/commit/85ee0a2))
* **memory:** Remove memory event emit, log instead ([cfb7ced](https://github.com/Amazebot/bbot/commit/cfb7ced))
* **memory:** Saving on load enabled if configured ([bce1506](https://github.com/Amazebot/bbot/commit/bce1506))
* **shell:** Allow shell adapter to set user ID ([cf1ae84](https://github.com/Amazebot/bbot/commit/cf1ae84))


### Features

* **config:** Add helper to reset all config ([82befde](https://github.com/Amazebot/bbot/commit/82befde))
* **nlu:** Add helper for logging NLU results ([c08b0dc](https://github.com/Amazebot/bbot/commit/c08b0dc))
* **thought:** Remember users on matched branch ([33a4849](https://github.com/Amazebot/bbot/commit/33a4849))



<a name="0.1.2"></a>
## [0.1.2](https://github.com/Amazebot/bbot/compare/v0.1.1...v0.1.2) (2018-08-12)


### Bug Fixes

* **middleware:** Let middleware be set before load ([91aa16c](https://github.com/Amazebot/bbot/commit/91aa16c))
* **thought:** Remove error logging when validation bypasses process ([acf4873](https://github.com/Amazebot/bbot/commit/acf4873))


### Features

* **config:** Add settings utilities ([8a32cdd](https://github.com/Amazebot/bbot/commit/8a32cdd)), closes [#91](https://github.com/Amazebot/bbot/issues/91)
* **state:** Add reply helper to state ([36aa269](https://github.com/Amazebot/bbot/commit/36aa269))



<a name="0.1.1"></a>
## [0.1.1](https://github.com/Amazebot/bbot/compare/v0.1.0...v0.1.1) (2018-08-12)


### Bug Fixes

* **adapter:** Log adapter startup errors properly ([0a24a10](https://github.com/Amazebot/bbot/commit/0a24a10))



<a name="0.1.0"></a>
# [0.1.0](https://github.com/Amazebot/bbot/compare/v0.0.5...v0.1.0) (2018-08-12)


### Code Refactoring

* **listen:** Semantic refactoring of listen module ([6695602](https://github.com/Amazebot/bbot/commit/6695602)), closes [#87](https://github.com/Amazebot/bbot/issues/87)


### BREAKING CHANGES

* **listen:** Listen module removed, replaced by path and branch modules.
Global listen helpers removed, now to be accessed by `global` attribute of bot, which is an instance of class, so the methods are consistent wether global or in isolated to context.



<a name="0.0.5"></a>
## [0.0.5](https://github.com/Amazebot/bbot/compare/v0.0.3...v0.0.5) (2018-08-12)


### Bug Fixes

* **shell:** Adapter loading and output ([914bf9e](https://github.com/Amazebot/bbot/commit/914bf9e))
* **shell:** Adapter output and logging is nice ([8bc8f24](https://github.com/Amazebot/bbot/commit/8bc8f24)), closes [#1](https://github.com/Amazebot/bbot/issues/1)


### Features

* **state:** Add ignore method for state to bypass all processing ([e736722](https://github.com/Amazebot/bbot/commit/e736722))
* **thoughts:** Add scope and thought sequence to state ([2357278](https://github.com/Amazebot/bbot/commit/2357278))



<a name="0.0.3"></a>
## [0.0.3](https://github.com/Amazebot/bbot/compare/v0.0.2...v0.0.3) (2018-08-12)



<a name="0.0.2"></a>
## [0.0.2](https://github.com/Amazebot/bbot/compare/v0.0.1...v0.0.2) (2018-08-12)


### Bug Fixes

* **listeners:** Listeners process shared state ([f974b45](https://github.com/Amazebot/bbot/commit/f974b45))



<a name="0.0.1"></a>
## [0.0.1](https://github.com/Amazebot/bbot/compare/6580ccc...v0.0.1) (2018-08-12)


### Bug Fixes

* **logs:** Improved config loading and logging from env ([74c9240](https://github.com/Amazebot/bbot/commit/74c9240))
* **nlu:** Add NLU result class with match helpers ([4ea6adf](https://github.com/Amazebot/bbot/commit/4ea6adf))
* **nlu:** NLU matching fixes and other patches ([ad3392b](https://github.com/Amazebot/bbot/commit/ad3392b)), closes [#53](https://github.com/Amazebot/bbot/issues/53)
* **nlu:** Restructure matching on NLU listeners ([efa7c5e](https://github.com/Amazebot/bbot/commit/efa7c5e))
* **shell:** Fix tests and linting ([c67aa2c](https://github.com/Amazebot/bbot/commit/c67aa2c))
* **start:** Add and test load state handlers ([24ccdf6](https://github.com/Amazebot/bbot/commit/24ccdf6))
* **thought-process:** Middleware and no recursion for act ([a66cfda](https://github.com/Amazebot/bbot/commit/a66cfda))


### Features

* Add adapter, listener, bit, message and id modules ([64e2009](https://github.com/Amazebot/bbot/commit/64e2009))
* **adapter:** Add Shell adapter ([80a91b0](https://github.com/Amazebot/bbot/commit/80a91b0))
* **adapters:** First draft Rocket.Chat adapter ([cd974d0](https://github.com/Amazebot/bbot/commit/cd974d0))
* **argv:** Load options from command line, env, package.json or config file ([e509c9b](https://github.com/Amazebot/bbot/commit/e509c9b))
* **b:** Add helpers to compose envelope ([f1e5184](https://github.com/Amazebot/bbot/commit/f1e5184))
* **brain:** Load and saving to storage adapter ([f97f155](https://github.com/Amazebot/bbot/commit/f97f155))
* **logger:** Add and test Winston for logging ([ec7febc](https://github.com/Amazebot/bbot/commit/ec7febc))
* **message:** Add RichMessage type ([b16aa8e](https://github.com/Amazebot/bbot/commit/b16aa8e))
* **middleware:** First draft middleware class ([6580ccc](https://github.com/Amazebot/bbot/commit/6580ccc))
* **middleware:** Fully tested and asynchronous without dependencies ([ef05a4c](https://github.com/Amazebot/bbot/commit/ef05a4c))
* **nlu:** Add NLU listener handling as property of text message ([f18f895](https://github.com/Amazebot/bbot/commit/f18f895))
* **respond:** Outgoing envelope handling ([631a5f9](https://github.com/Amazebot/bbot/commit/631a5f9))
* **rocketchat:** Add adapter and fix processes ([0169337](https://github.com/Amazebot/bbot/commit/0169337))
* **thought:** Re-architect thought process ([ae2e80b](https://github.com/Amazebot/bbot/commit/ae2e80b)), closes [#65](https://github.com/Amazebot/bbot/issues/65) [#68](https://github.com/Amazebot/bbot/issues/68) [#69](https://github.com/Amazebot/bbot/issues/69)
* **thought-process:** Add hear and listen stages ([28df5dd](https://github.com/Amazebot/bbot/commit/28df5dd))
* **thought-process:** Add incoming stages and interfaces ([bd98c0d](https://github.com/Amazebot/bbot/commit/bd98c0d))
* **thought-process:** Update respond and remember ([07b844f](https://github.com/Amazebot/bbot/commit/07b844f))
