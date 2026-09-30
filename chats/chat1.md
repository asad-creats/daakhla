# Student registration system app

_Started 2026-09-22 18:31 UTC_

---

## User

Design a mobile app for a student registration system. students should be able to fill in their details and submit. and user should be able to view all the details of students of multiple cities or regions of pakistan separated to categories in the app based on the registration. also add the option of multiple admin users login option to view the data.

## Assistant

_[tool: list_files]_

_[tool: copy_starter_component]_

_[tool: grep]_

_[tool: dc_write]_

_[tool: ready_for_verification]_

I've built **Daakhla**, a clickable prototype of the student registration app in a phone frame. It's out for a final automated check now.

- **Student sign-up:** a 4-step form covering personal details, contact and region, academic details, then a review screen. Fields are checked as you go, and CNIC and phone numbers format themselves as you type. Submitting gives the student a registration ID.
- **Admin sign-in:** there are 4 demo admin accounts; tap one on the login screen to fill it in. The super admin (Ayesha) sees all of Pakistan. Bilal, Sana and Imran each see only their own province (Punjab, Sindh or KP).
- **Overview:** totals, then registrations broken down by province (or by city for regional admins) and by program. Tapping any row opens the matching student list.
- **Students list:** grouped by city, with search and filters for region, program and pending status. Tapping a student opens their full details, where an admin can verify them or mark them pending.
- **Admins tab:** super admins can add new admin accounts and choose which regions each one can see.

The app starts with 50 made-up students. New registrations and admin accounts are saved in the browser, so they stay after a reload. There are two settings you can change: which screen the app opens on, and whether the demo accounts show on the login screen.

With no design system to follow, I chose the look myself: a deep green and off-white palette with the Manrope font.

## User

its basically for the admins only. students are only getting a registration link or qr for their region that will take their data and add to the relevant region

## Assistant

_[tool: run_script]_

Now the logic.

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_set_props]_

_[tool: ready_for_verification]_

The app is now for admins only: it opens on admin sign-in, and students register through a link or QR code for their region. An automated check is running on the changes now.

- **New Links tab:** each region the admin can see has its own link and QR code, with buttons to copy the link, open the QR full-size to save it, or preview the form.
- **Student form:** it now looks like a web page opened from the link. The province is filled in by the link and can't be changed, and each submission goes straight into that region's data.
- **Regional admins:** they only see their own region's link. The super admin sees links for all 7 regions.

The QR codes are placeholders and won't scan. A real version needs actual QR generation and a hosted form behind each link.

