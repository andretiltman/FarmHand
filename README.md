# FarmHand

A simple mobile app for tracking your plants (their journey from seed to harvest, and how often you water them) and your chickens (when you last fed them and how many eggs they lay). Built with [Expo](https://expo.dev) / React Native, so it runs on iOS, Android and the web.

## Features

- **One list of everything** – all plants and animals on the home screen, each showing its status at a glance:
  - Crops: their current stage and a countdown – *Seedling in 7 days*, *Transplant in 22 days*, *Harvest in 65 days* – turning orange when it's time to transplant or harvest.
  - Plants: when they were last watered and when they're next due (turns orange when due, red when overdue).
  - Animals: when they were last fed (orange until they've been fed today) and eggs collected today / over the last 7 days.
- **Quick actions** – tap 💧 **Water** on a plant, or 🌾 **Feed** / 🥚 **+1** on an animal, right from the list.
- **Guided "Add" popup** – the **Add** button at the bottom opens a step-by-step popup:
  1. Choose **Plant** or **Animal**
  2. For plants, pick a crop (corn, tomato, strawberry, …) – each tile shows whether it's in season – or *Other plant / houseplant* for watering only
  3. Enter details – for crops, a **growing guide** (sowing season with a *good time to sow?* check, depth, spacing, germination temperature and time, time to harvest, special notes like cold stratification), then choose **sow directly in the ground** or **start in a seed tray and transplant**, with the recommended method pre-selected (e.g. direct sowing for corn, a seed tray for tomatoes); for animals, type + how many
  4. Review the estimated timeline and save
- **Seed → Seedling → (Transplant) → Harvest** – each crop follows its journey:
  - After sowing, it counts down to the seedling stage, which starts automatically (or tap *It has sprouted* if it's early).
  - Direct-sown crops then count down to harvest.
  - Tray-started crops count down to *ready to transplant*, and the harvest countdown only starts once you tap **Mark as transplanted**.
  - Slow, uneven germinators like strawberries (7 days to 8 weeks) show *Should sprout any day* until the slowest expected date, instead of assuming they've sprouted.
  - Timings are typical averages per crop (see `src/crops.ts`); real gardens vary.
- **Seasons follow your hemisphere** – worked out from the phone's time zone, so October is spring in South Africa and autumn in Europe.
- **Details popup** – tap any item to see its timeline, stats and full history, confirm the next growth stage, log several eggs at once, undo a mis-tap, or delete it.
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
src/crops.ts                    Crop catalog: sowing method, timings, growing guide
src/seasons.ts                  Hemisphere-aware seasons and sowing advice
src/growth.ts                   Seed → seedling → transplant → harvest stage logic
src/stats.ts, src/dates.ts      Watering-due and egg-count calculations
src/components/AddItemModal.tsx Guided add popup (plant or animal)
src/components/ItemDetailModal.tsx  Item history / logging / delete
src/components/ItemCard.tsx     A row in the list
src/components/Journey.tsx      Growth timeline
src/components/CropGuide.tsx    Growing guide card
```
