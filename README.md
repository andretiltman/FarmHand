# FarmHand

A simple mobile app for tracking your plants (and how often you water them) and your chickens (and how many eggs they lay). Built with [Expo](https://expo.dev) / React Native, so it runs on iOS, Android and the web.

## Features

- **One list of everything** – all plants and animals on the home screen, each showing its status at a glance:
  - Plants: when they were last watered and when they're next due (turns orange when due, red when overdue).
  - Animals: eggs collected today and over the last 7 days.
- **Quick actions** – tap 💧 **Water** on a plant or 🥚 **+1** on an animal right from the list.
- **Guided "Add" popup** – the **Add** button at the bottom opens a 3-step popup:
  1. Choose **Plant** or **Animal**
  2. Enter details (name + watering schedule, or animal type + how many)
  3. Review and save
- **Details popup** – tap any item to see its stats and full history, log several eggs at once, undo a mis-tap, or delete it.
- Data is saved on the device (AsyncStorage), no account needed.

## Running it

```bash
npm install
npm start        # then scan the QR code with the Expo Go app on your phone
```

Or run `npm run android`, `npm run ios`, or `npm run web`.

## Project layout

```
App.tsx                         Home screen: list + bottom Add button
src/useItems.ts                 State + on-device persistence
src/types.ts                    Plant / animal data model
src/stats.ts, src/dates.ts      Watering-due and egg-count calculations
src/components/AddItemModal.tsx Guided add popup (plant or animal)
src/components/ItemDetailModal.tsx  Item history / logging / delete
src/components/ItemCard.tsx     A row in the list
```
