# Admin MIS (Perfact Group)

Data classification: CONFIDENTIAL

## What this is

A web application for the Admin team to keep one register of every asset and record: laptops, PCs, mice, pendrives, fans, chairs, ACs, UPS units, licences, vendors, contacts, utility readings and the other sheets in the existing workbook. Thirty-three categories are created on first start, including a Laptop category that was not in the sheet list. Every entry gets a unique ID made of the category prefix and a running number, for example PC/01 and PC/02, and a QR code that opens that entry directly. Numbers are never reused, even after a deletion, so a printed label always points to the same item.

## Starting the application

Install Node.js 18 or later on the computer or server that will host it. In the project folder run `npm install` once and then `npm start`. The site opens at http://localhost:3000. Set the PORT environment variable to change the port, DATA_DIR to store the database and uploads elsewhere, and ADMIN_PASSWORD to choose the first admin password before the first start.

The first sign-in is username `admin` with password `Admin@12345`, and a banner prompts for a change. Do this before anyone else uses the system.

## Roles

Admin users can add, edit and delete items, history entries, users, categories and settings. Viewer users can search, open items, scan QR codes and download data, but cannot change anything. Users are managed under Administration.

## QR codes and labels

Before printing labels in bulk, open Settings and enter the address your staff use to reach the site, such as http://192.168.1.20:3000 or an internal domain name. That address is written into every QR code. Labels printed from a category list or from an item page come in three sizes. Scanning with a phone camera opens the item page and asks for sign-in once. The in-app Scan QR button uses the phone camera inside the browser and needs the site to be served over HTTPS, except on the same computer; without HTTPS it falls back to typing the ID.

## History, photos and downloads

Every item page has a History section. Admins add dated entries with a type, details and any number of PDFs or images. Creation, field changes, status changes and photo changes are recorded automatically as system entries. The History log page in the sidebar shows all entries across items with filters. Each category can be downloaded as an Excel table, optionally with photos embedded and the full history as a second sheet, and the dashboard downloads every category at once. Administration, Settings and backup offers a ZIP that holds the workbook, all attachments sorted by item ID, all photos and a copy of the database. Excel files are marked CONFIDENTIAL in the print footer.

Rows can also be loaded in bulk from Excel. Open a category, choose Import Excel, download the template, fill it in and upload it. Each row becomes a new entry with the next free ID. Dropdown columns in the template and in downloads carry data validation.

## Points to confirm

The sheet named WGs Combid details is not self-explanatory, so it was created with generic fields (item, description, location, assigned to, date, quantity, remarks). Fields for every category can be changed under Categories and fields without touching the code. The prefix of a category is locked once it has items. Fields marked as due-date alerts, such as warranty end, service due and licence expiry, feed the dashboard list of items due within 60 days. Uploaded photos are reduced in the browser to about 1400 pixels before saving.

## Backup

Copy the data folder, or use the ZIP backup in Settings. Restore by placing mis.db and the uploads folder from a backup into the data folder while the application is stopped.

## Importing an existing equipment list

Open a category, choose Import Excel and download the template. If the sheet has an ID column holding codes with the category prefix, such as PC/001, those codes are kept as they are and the next new item continues after the highest number. Rows without an ID get the next free number, and a row whose code already exists is skipped with a message, so importing the same file twice is safe. Column headings must match the field names of the category.

## Two-way Excel sync (OneDrive)

The database remains the master record. The application keeps one Excel workbook, Perfact-MIS-Live.xlsx, up to date. It is created automatically in the folder data/excel inside the project, so no set-up is needed. To open it in Microsoft Excel from other devices, enter the full path of a OneDrive folder under "Excel auto-sync folder" in Settings.

From the application to Excel: about three seconds after every save, edit or delete, the workbook is rewritten with an index sheet, one sheet per category and the complete item history.

From Excel to the application: when the workbook is saved in Excel, the application reads it within about five seconds. A new row (ID left blank) becomes a new asset and receives the next ID. Editing a cell, or the Status column, updates the asset. Deleting a row deletes the asset. The change is recorded in the item history as "edited in Excel", and the open pages refresh by themselves. The workbook is also read when the server starts, so edits made while it was switched off are not lost.

Safeguards: before any asset is deleted because its row is missing, a copy of the database is saved in data/backups, and the latest ten are kept. If more than ten rows, or more than 30 per cent of a category, disappear at once, nothing is deleted and Settings shows a message. Photos and history files of removed assets stay in data/uploads. Keep the ID column and the header row unchanged. The application cannot rewrite the workbook while it is open in Excel, so it retries after the file is closed. Data classification: CONFIDENTIAL.
