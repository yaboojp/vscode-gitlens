'use strict';
import { CancellationTokenSource, window } from 'vscode';
import { Commands, StashSaveCommandArgs } from '../commands';
import { GlyphChars } from '../constants';
import { Container } from '../container';
import { GitStash, GitStashCommit } from '../git/gitService';
import { KeyNoopCommand } from '../keyboard';
import { Iterables, Strings } from '../system';
import {
    CommandQuickPickItem,
    CommitQuickPickItem,
    getQuickPickIgnoreFocusOut,
    showQuickPickProgress
} from './commonQuickPicks';

export class StashListQuickPick {
    static showProgress(mode: 'list' | 'apply') {
        const message =
            mode === 'apply'
                ? `Apply stashed changes to your working tree${GlyphChars.Ellipsis}`
                : `stashed changes ${GlyphChars.Dash} search by message, filename, or commit id`;
        return showQuickPickProgress(message, {
            left: KeyNoopCommand,
            ',': KeyNoopCommand,
            '.': KeyNoopCommand
        });
    }

    static async show(
        stash: GitStash,
        mode: 'list' | 'apply',
        progressCancellation: CancellationTokenSource,
        goBackCommand?: CommandQuickPickItem,
        currentCommand?: CommandQuickPickItem
    ): Promise<CommitQuickPickItem<GitStashCommit> | CommandQuickPickItem | undefined> {
        const items = ((stash &&
            Array.from(Iterables.map(stash.commits.values(), c => new CommitQuickPickItem<GitStashCommit>(c)))) ||
            []) as (CommitQuickPickItem<GitStashCommit> | CommandQuickPickItem)[];

        if (mode === 'list') {
            const commandArgs: StashSaveCommandArgs = {
                goBackCommand: currentCommand
            };
            items.splice(
                0,
                0,
                new CommandQuickPickItem(
                    {
                        label: '$(plus) Stash Changes',
                        description: `${Strings.pad(GlyphChars.Dash, 2, 3)} stashes all changes`
                    },
                    Commands.StashSave,
                    [commandArgs]
                )
            );
        }

        if (goBackCommand) {
            items.splice(0, 0, goBackCommand);
        }

        if (progressCancellation.token.isCancellationRequested) return undefined;

        const scope = await Container.keyboard.beginScope({ left: goBackCommand });

        progressCancellation.cancel();

        const pick = await window.showQuickPick(items, {
            matchOnDescription: true,
            placeHolder:
                mode === 'apply'
                    ? `Apply stashed changes to your working tree${GlyphChars.Ellipsis}`
                    : `stashed changes ${GlyphChars.Dash} search by message, filename, or commit id`,
            ignoreFocusOut: getQuickPickIgnoreFocusOut()
            // onDidSelectItem: (item: QuickPickItem) => {
            //     scope.setKeyCommand('right', item);
            // }
        });

        await scope.dispose();

        return pick;
    }
}
