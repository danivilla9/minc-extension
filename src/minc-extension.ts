/**********************************************************************
 * Copyright (C) 2025 Red Hat, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ***********************************************************************/

import { env, type ExtensionContext } from '@podman-desktop/api';
import { InversifyBinding } from './inject/inversify-binding';
import { Octokit } from '@octokit/rest';
import { ProviderManager } from './manager/provider-manager';
import { CliToolManager } from './manager/cli-tool-manager';
import type { Container } from 'inversify';

export class MincExtension {
  #extensionContext: ExtensionContext;

  #inversifyBinding: InversifyBinding | undefined;

  #providerManager: ProviderManager | undefined;
  #cliToolManagerManager: CliToolManager | undefined;
  #container: Container | undefined;

  constructor(readonly extensionContext: ExtensionContext) {
    this.#extensionContext = extensionContext;
  }

  async activate(): Promise<void> {
    const telemetryLogger = env.createTelemetryLogger();

    const octokit = new Octokit();
    this.#inversifyBinding = new InversifyBinding(this.#extensionContext, telemetryLogger, octokit);
    this.#container = await this.#inversifyBinding.initBindings();

    this.#providerManager = await this.#container.getAsync(ProviderManager);
    this.#cliToolManagerManager = await this.#container.getAsync(CliToolManager);

    // perform the registration after the startup to not hold up the startup
    this.deferActivate().catch((e: unknown) => console.error('error in deferActivate', e));
  }

  protected async deferActivate(): Promise<void> {
    await this.#cliToolManagerManager?.registerCliTool();
    await this.#providerManager?.create();
  }

  async deactivate(): Promise<void> {
    await this.#inversifyBinding?.dispose();
    this.#cliToolManagerManager = undefined;
    this.#providerManager = undefined;
  }

  protected getContainer(): Container | undefined {
    return this.#container;
  }
}
