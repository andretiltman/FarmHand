# FarmHand

A simple mobile app for tracking your plants (their journey from seed to harvest, and how often you water them), your chickens (when you last fed them and how many eggs they lay) and recurring maintenance jobs (like adding bio enzymes to the septic tank). Built with [Expo](https://expo.dev) / React Native, so it runs on iOS, Android and the web.

## Features

- **One list of everything** – all plants and animals on the home screen, each showing its status at a glance:
  - Crops: their current stage and a countdown – *Seedling in 7 days*, *Transplant in 22 days*, *Harvest in 65 days* – turning orange when it's time to transplant or harvest.
  - Plants: when they were last watered and when they're next due (turns orange when due, red when overdue).
  - Animals: when they were last fed (orange until they've been fed today) and eggs collected today / over the last 7 days.
- **Sections** – chips at the top of the list filter what you see, each with a count:
  - ⭐ **Overview** (the default) – only what needs attention now: plants due, overdue or never watered, seedlings ready to transplant, crops ready to harvest, animals not fed today, and maintenance tasks that are due. Shows *All caught up* when there's nothing to do.
  - 🌰 **Sown** – seeds that haven't sprouted yet.
  - 🌱 **Seedlings** – sprouted, waiting to be transplanted.
  - 🪴 **Plants** – growing, ready, harvested and watering-only plants.
  - 🐔 **Animals**.
  - 🛠️ **Maintenance** – recurring jobs.
- **Maintenance tasks** – recurring jobs like *Septic tank bio enzymes* (monthly), *Clean gutters* or *Service lawnmower*. Pick a suggestion or type your own, choose how often it repeats (weekly to yearly, or any number of days), and say when it was last done so it doesn't start out overdue. Each shows when it's next due (orange when due, red when overdue).
- **Quick actions** – tap 💧 **Water** on a plant, 🌾 **Feed** / 🥚 **+1** on an animal, or ✓ **Done** on a maintenance task, right from the list.
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
- **Tags** – mark plants as **GMO-free**, **Bush** or **Runner** (a plant can't be both bush and runner), or type your own like *Heirloom*. Tags show on the plant's card, can be changed in its details, and are sent to Home Assistant as a `tags` attribute.
- **Seasons follow your hemisphere** – worked out from the phone's time zone, so October is spring in South Africa and autumn in Europe.
- **Details popup** – tap any item to see its timeline, stats and full history, confirm the next growth stage, log several eggs at once, undo a mis-tap, change how often a plant needs watering or a task repeats, rename it (✏️ **Rename**), or delete it.
- **Full screen on Android** – the system navigation bar is hidden while FarmHand is open; swipe up from the bottom edge to bring it back briefly.
- **Send plants to another phone** – tap 📤 at the top, tick the plants to send (optionally with their photos) and tap **Send**. FarmHand makes a small file and opens your phone's share menu, so you can send it by WhatsApp, email, Bluetooth, Nearby Share or AirDrop. The other person saves the file, taps 📤 → **Receive** → **Choose file**, and the plants are added with their whole journey, watering history, tags and photos. Afterwards the sender can **Remove from my phone** to finish the move, or keep a copy if you're both looking after them.
- **Sync two phones** – for a garden you look after together. Each phone keeps its own copy and they merge each other's changes: waterings, feedings, eggs and jobs done on either phone are all kept (so you'll both see the plants were watered), and for anything else – a rename, a new watering schedule, a growth stage – the most recent change wins. Deleting something or undoing an entry on one phone removes it on the other too. Two ways to sync:
  - **Automatically through Home Assistant** – connect both phones to the same Home Assistant (🏠) and turn on **Sync with other phones** on both. Changes come through within a minute while FarmHand is open. Photos stay on the phone that took them.
  - **With a sync file** – 📤 → **Sync** → **Send sync file**, and the other phone opens it with 📤 → **Receive**. Do it both ways for a full sync. Handy when one of you is away from home. Choose which photos to include: **None**, the **Last 7 days** (photos added to FarmHand in the past week – keeps the file small for regular syncs) or **All** (for the first sync). Photos left out aren't removed from the other phone.
- **Home Assistant sensors** – tap 🏠 at the top, enter your Home Assistant address and a long-lived access token, and every plant, animal and maintenance task appears in Home Assistant as a sensor (see below).
- Data is saved on the device (AsyncStorage), no account needed.

## Home Assistant

1. In Home Assistant, open your profile → **Security** → **Long-lived access tokens** → **Create token**, and copy it.
2. In FarmHand, tap 🏠, enter your Home Assistant address (e.g. `http://192.168.1.10:8123` – on Android use the IP address rather than `homeassistant.local`) and the token, then tap **Connect**.

FarmHand then creates these sensors:

| Entity | State | Useful attributes |
| --- | --- | --- |
| `sensor.farmhand_<crop name>` | growth stage: `seed`, `seedling`, `growing`, `ready`, `harvested` | `headline` (*Harvest in 12 days*), `needs_action`, `next_milestone`, `next_milestone_date`, `water_status`, `days_until_water_due`, `last_watered`, `tags` |
| `sensor.farmhand_<plant name>` (watering only) | `never`, `ok`, `due`, `overdue` | `days_until_water_due`, `last_watered`, `water_every_days`, `tags` |
| `sensor.farmhand_<animal name>` | eggs collected today | `eggs_last_7_days`, `eggs_total`, `fed_today`, `last_fed`, `head_count` |
| `sensor.farmhand_<task name>` | `never`, `ok`, `due`, `overdue` | `due` (*Due in 23 days*), `days_until_due`, `every_days`, `last_done` |
| `sensor.farmhand_plants_to_water` | number of plants due, overdue or never watered | |
| `sensor.farmhand_eggs_today` | eggs collected today across all animals | |
| `sensor.farmhand_tasks_due` | number of maintenance tasks due, overdue or never done | |

With **Sync with other phones** on, each phone also keeps a copy of everything in a hidden `farmhand_sync.phone_<id>` entity and reads the other phones' copies from there.

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
src/types.ts                    Plant / animal / maintenance task data model
src/crops.ts                    Crop catalog: sowing method, timings, growing guide
src/seasons.ts                  Hemisphere-aware seasons and sowing advice
src/growth.ts                   Seed → seedling → transplant → harvest stage logic
src/stats.ts, src/dates.ts      Watering/task-due and egg-count calculations
src/sections.ts                 Home screen sections (Overview / Sown / Seedlings / Plants / Animals / Maintenance)
src/components/AddItemModal.tsx Guided add popup (plant, animal or maintenance task)
src/components/ItemDetailModal.tsx  Item history / logging / delete
src/components/HomeAssistantModal.tsx  Connect to Home Assistant
src/components/TransferModal.tsx  Send plants to / receive plants from another phone
src/transfer.ts                 Plant transfer and sync file formats (pack / unpack)
src/sync.ts                     Merging two phones' copies of the items
src/ids.ts, src/device.ts       Item GUIDs and this phone's id
src/transferFile(.web).ts       Share sheet and file picker for transfer files
src/components/ItemCard.tsx     A row in the list
src/components/Journey.tsx      Growth timeline
src/components/CropGuide.tsx    Growing guide card
src/components/Calendar.tsx     Date picker
src/components/MilestoneEditor.tsx  Change a stage's date
src/components/PhotoLog.tsx, PhotoViewer.tsx  Plant photos
src/photoStorage(.web).ts       Saving photos on the device (or in the browser)
```
