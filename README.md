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
- **Adjust the timeline for your variety** – in a plant's details, tap any stage (Sown, Seedling, Transplant, Harvest) and pick a date on the calendar. Today or earlier records when it actually happened; a future date changes that plant's estimate. *Reset to the usual timing* undoes a change.
- **Photo log** – take or choose photos of each plant as it grows. Photos are labelled by age (*Day 23*), can be re-dated (handy for older photos from your library) or deleted, and the newest one becomes the plant's icon on the list.
- **Seasons follow your hemisphere** – worked out from the phone's time zone, so October is spring in South Africa and autumn in Europe.
- **Details popup** – tap any item to see its timeline, stats and full history, confirm the next growth stage, log several eggs at once, undo a mis-tap, or delete it.
- **Home Assistant sensors** – tap 🏠 at the top, enter your Home Assistant address and a long-lived access token, and every plant and animal appears in Home Assistant as a sensor (see below).
- Data is saved on the device (AsyncStorage), no account needed.

## Home Assistant

1. In Home Assistant, open your profile → **Security** → **Long-lived access tokens** → **Create token**, and copy it.
2. In FarmHand, tap 🏠, enter your Home Assistant address (e.g. `http://192.168.1.10:8123` – on Android use the IP address rather than `homeassistant.local`) and the token, then tap **Connect**.

FarmHand then creates these sensors:

| Entity | State | Useful attributes |
| --- | --- | --- |
| `sensor.farmhand_<crop name>` | growth stage: `seed`, `seedling`, `growing`, `ready`, `harvested` | `headline` (*Harvest in 12 days*), `needs_action`, `next_milestone`, `next_milestone_date`, `water_status`, `days_until_water_due`, `last_watered` |
| `sensor.farmhand_<plant name>` (watering only) | `never`, `ok`, `due`, `overdue` | `days_until_water_due`, `last_watered`, `water_every_days` |
| `sensor.farmhand_<animal name>` | eggs collected today | `eggs_last_7_days`, `eggs_total`, `fed_today`, `last_fed`, `head_count` |
| `sensor.farmhand_plants_to_water` | number of plants due, overdue or never watered | |
| `sensor.farmhand_eggs_today` | eggs collected today across all animals | |

Sensors are updated whenever you change something, when the app is opened, and every 15 minutes while it's open. Deleting an item removes its sensor, and **Disconnect** removes them all.

Good to know:

- FarmHand pushes the sensors from your phone, so they only update while the app is open. Home Assistant also forgets them when it restarts, until FarmHand next syncs.
- When using the web version, add the page's address to `cors_allowed_origins` under `http:` in Home Assistant's `configuration.yaml`.
- A standalone Android/iOS build talking to Home Assistant over plain `http://` needs cleartext traffic allowed (Expo Go already allows it); using an `https://` address (e.g. Nabu Casa) avoids this.

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
src/homeAssistant.ts            Home Assistant sensors and REST API calls
src/useHomeAssistant.ts         Home Assistant connection and auto-sync
src/types.ts                    Plant / animal data model
src/crops.ts                    Crop catalog: sowing method, timings, growing guide
src/seasons.ts                  Hemisphere-aware seasons and sowing advice
src/growth.ts                   Seed → seedling → transplant → harvest stage logic
src/stats.ts, src/dates.ts      Watering-due and egg-count calculations
src/components/AddItemModal.tsx Guided add popup (plant or animal)
src/components/ItemDetailModal.tsx  Item history / logging / delete
src/components/HomeAssistantModal.tsx  Connect to Home Assistant
src/components/ItemCard.tsx     A row in the list
src/components/Journey.tsx      Growth timeline
src/components/CropGuide.tsx    Growing guide card
src/components/Calendar.tsx     Date picker
src/components/MilestoneEditor.tsx  Change a stage's date
src/components/PhotoLog.tsx, PhotoViewer.tsx  Plant photos
src/photoStorage(.web).ts       Saving photos on the device (or in the browser)
```
