import { expect, test } from '@playwright/test';

test('applies state + tap websocket events and reorders leaderboard', async ({ page }) => {
  await page.route('**/api/state', async (route) => {
    await route.fulfill({
      json: {
        game: {
          awayAbbr: 'CHC',
          awayName: 'CUBS',
          homeAbbr: 'CIN',
          homeName: 'REDS',
          innings: { away: [0, 0, 0, null, null, null, null, null, null], home: [0, 0, 0, null, null, null, null, null, null] },
          R: { away: 0, home: 0 },
          H: { away: 0, home: 0 },
          E: { away: 0, home: 0 },
          inningOrdinal: '3rd',
          inningState: 'Bottom',
          abstractState: 'Live',
        },
        participants: [
          { uid: 'A', name: 'Alice', hotdogs: 1, beers: 0 },
          { uid: 'B', name: 'Bob', hotdogs: 0, beers: 0 },
        ],
        readerHealth: { hotdogOnline: true, beerOnline: true },
      },
    });
  });

  await page.addInitScript(() => {
    class MockSocket {
      listeners: Record<string, Array<(evt: MessageEvent) => void>> = {};

      constructor() {
        setTimeout(() => this.emit('open', new Event('open')), 20);
        setTimeout(
          () =>
            this.emit(
              'message',
              new MessageEvent('message', {
                data: JSON.stringify({
                  type: 'state',
                  state: {
                    game: {
                      awayAbbr: 'CHC',
                      awayName: 'CUBS',
                      homeAbbr: 'CIN',
                      homeName: 'REDS',
                      innings: {
                        away: [0, 0, 0, null, null, null, null, null, null],
                        home: [0, 0, 1, null, null, null, null, null, null],
                      },
                      R: { away: 0, home: 1 },
                      H: { away: 1, home: 2 },
                      E: { away: 0, home: 0 },
                      inningOrdinal: '3rd',
                      inningState: 'Bottom',
                      abstractState: 'Live',
                    },
                    participants: [
                      { uid: 'A', name: 'Alice', hotdogs: 1, beers: 0 },
                      { uid: 'B', name: 'Bob', hotdogs: 2, beers: 0 },
                    ],
                    readerHealth: { hotdogOnline: true, beerOnline: true },
                  },
                }),
              })
            ),
          250
        );
      }

      addEventListener(type: string, listener: (evt: MessageEvent) => void) {
        this.listeners[type] = this.listeners[type] || [];
        this.listeners[type].push(listener);
      }

      close() {}

      emit(type: string, event: Event) {
        (this.listeners[type] || []).forEach((listener) => listener(event as MessageEvent));
      }
    }

    Object.defineProperty(window, 'WebSocket', {
      value: MockSocket,
      writable: true,
    });
  });

  await page.goto('/');

  await expect(page.getByText('ALICE')).toBeVisible();
  await expect(page.getByText('BOB')).toBeVisible();

  const bobName = page.locator('span').filter({ hasText: /^Bob$/ }).first();
  const aliceName = page.locator('span').filter({ hasText: /^Alice$/ }).first();

  await expect.poll(async () => {
    const bobBox = await bobName.boundingBox();
    const aliceBox = await aliceName.boundingBox();
    if (!bobBox || !aliceBox) {
      return Number.POSITIVE_INFINITY;
    }
    return bobBox.y - aliceBox.y;
  }).toBeLessThan(0);
});
