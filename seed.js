// Default categories (one per sheet in the existing Admin workbook) with their fields.
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const T = (label, o = {}) => ({ key: slug(label), label, type: 'text', ...o });
const N = (l, o) => ({ ...T(l, o), type: 'number' });
const M = (l, o) => ({ ...T(l, o), type: 'money' });
const D = (l, o) => ({ ...T(l, o), type: 'date' });
const S = (l, options, o) => ({ ...T(l, o), type: 'select', options });
const A = (l, o) => ({ ...T(l, o), type: 'textarea' });

const OSD = () => A('Original Sheet Data');
const hw = (mid = []) => [
  T('Brand'), T('Model'), T('Serial No.'), T('Assigned To'), T('Location'), ...mid,
  D('Purchase Date'), T('Vendor'), M('Purchase Cost (₹)'), D('Warranty Till', { expiry: true }), A('Remarks'),
];
const furn = (mid = []) => [
  T('Description'), ...mid, T('Location'), T('Assigned To'),
  S('Condition', ['New', 'Good', 'Fair', 'Poor']),
  D('Purchase Date'), T('Vendor'), M('Purchase Cost (₹)'), A('Remarks'),
];
const appl = (mid = []) => [
  T('Brand'), T('Model'), T('Serial No.'), T('Location'), ...mid,
  D('Purchase Date'), T('Vendor'), M('Purchase Cost (₹)'), D('Warranty Till', { expiry: true }),
  D('Next Service Due', { expiry: true }), A('Remarks'),
];

const G1 = 'IT & Electronics', G2 = 'Connectivity & Licences', G3 = 'Furniture & Fixtures',
  G4 = 'Appliances', G5 = 'Premises & Utilities', G6 = 'Records & Attendance', G7 = 'Vendors & Contacts';

module.exports = [
  // IT & Electronics
  { name: 'Laptop', prefix: 'LAP', grp: G1, fields: hw([T('Processor'), T('RAM'), T('Storage'), T('Operating System'), T('Charger Serial No.')]) },
  { name: 'PC Details', prefix: 'PC', grp: G1, fields: [
    T('Brand'), T('Model'), T('Serial No.'), T('Assigned To'), T('Location'),
    S('Device Type', ['Windows Laptop', 'Desktop', 'MacBook', 'Chromebook', 'AIO', 'Other']),
    T('Processor'), T('RAM'), T('Storage'), T('Screen Size'), T('Operating System'), T('Monitor Serial No.'),
    D('Purchase Date'), T('Purchase Year'), T('Vendor'), M('Purchase Cost (₹)'),
    S('Warranty Cover', ['Cannot be extended', 'Out of warranty', 'Standard', 'Extended']), D('Warranty Till', { expiry: true }),
    S('Type-C Charging', ['Yes', 'No']), T('Bill Link'), T('History Card Link'), A('Remarks')] },
  { name: 'Apple Products Tracker', prefix: 'APL', grp: G1, fields: [
    S('Product Type', ['iPhone', 'iPad', 'MacBook', 'Mac Mini', 'iMac', 'Apple Watch', 'AirPods', 'Apple TV', 'Other']),
    T('Model'), T('Serial No. / IMEI'), T('Assigned To'), T('Location'), T('Apple ID'), T('Storage'), T('Colour'),
    D('Purchase Date'), T('Vendor'), M('Purchase Cost (₹)'), D('Warranty Till', { expiry: true }), T('Model Name'), T('Photo Link'), A('Remarks'), OSD()] },
  { name: 'IT List', prefix: 'IT', grp: G1, fields: [
    T('Item Name'), T('Brand'), T('Model'), T('Serial No.'), T('Assigned To'), T('Location'),
    D('Purchase Date'), T('Vendor'), M('Purchase Cost (₹)'), D('Warranty Till', { expiry: true }), A('Remarks')] },
  { name: 'Mouse Details', prefix: 'MOU', grp: G1, fields: hw([S('Type', ['Wired', 'Wireless', 'Bluetooth'])]) },
  { name: 'Pendrive Details', prefix: 'PEN', grp: G1, fields: [
    T('Brand'), T('Capacity (GB)'), T('Serial No.'), T('Assigned To'), T('Location'),
    D('Purchase Date'), T('Vendor'), M('Purchase Cost (₹)'), A('Remarks')] },
  { name: 'TV Monitor Details', prefix: 'TVM', grp: G1, fields: hw([S('Type', ['TV', 'Monitor', 'Projector']), T('Screen Size (inch)')]) },
  { name: 'Camera Details', prefix: 'CAM', grp: G1, fields: hw([S('Camera Type', ['CCTV', 'IP Camera', 'Dome', 'Bullet', 'Webcam']), T('IP Address'), T('Resolution')]) },
  { name: 'Deco Details', prefix: 'DEC', grp: G1, fields: hw([T('MAC Address'), T('IP Address')]) },
  { name: 'UPS Details', prefix: 'UPS', grp: G1, fields: hw([T('Capacity (VA)'), T('Battery Count'), D('Battery Replaced On')]) },
  { name: 'Hotspot details', prefix: 'HOT', grp: G1, fields: hw([T('SIM Number'), T('Mobile Number'), T('Network Provider'), T('IMEI'),
    T('Plan'), T('SSID'), T('SSID Password'), T('Purpose'), D('Issue Date'), D('Issue Till Date'), D('Last Recharge Date'),
    M('Last Recharge Amount (₹)'), D('Next Recharge Date', { expiry: true }), T('Connection In Name Of')]).concat([A('Issuance Log'), OSD()]) },
  { name: 'Telephone', prefix: 'TEL', grp: G1, fields: hw([T('Extension No.'), T('Phone Number')]) },

  // Connectivity & Licences
  { name: 'All Office Internet Connection Details', prefix: 'NET', grp: G2, fields: [
    T('Service Provider'), S('Connection Type', ['Fibre', 'Broadband', 'Leased Line', 'Wireless', 'Mobile Data']),
    T('Plan'), T('Speed (Mbps)'), T('Customer / Account ID'), T('Static IP'), T('Office / Location'),
    M('Monthly Charges (₹)'), D('Renewal Date', { expiry: true }), T('Support Contact'), A('Remarks')] },
  { name: 'Jio Number', prefix: 'JIO', grp: G2, fields: [
    T('Mobile Number'), T('SIM Number'), T('Assigned To'), T('Department'), T('Plan'),
    D('Last Recharge Date'), D('Validity Till', { expiry: true }), M('Recharge Amount (₹)'), A('Remarks')] },
  { name: 'MS Licenses', prefix: 'MSL', grp: G2, fields: [
    T('Product'), T('Edition'), T('License Key'), N('Quantity'), T('Assigned To'), T('Device / Asset ID'),
    D('Purchase Date'), T('Vendor'), M('Purchase Cost (₹)'), D('Expiry Date', { expiry: true }), A('Remarks')] },

  // Furniture & Fixtures
  { name: 'Table Details', prefix: 'TBL', grp: G3, fields: furn([T('Material'), T('Size')]) },
  { name: 'Chair Details', prefix: 'CHR', grp: G3, fields: furn([S('Type', ['Executive', 'Visitor', 'Staff', 'Stool', 'Other']), T('Colour'),
    T('Old Code'), T('Source Sheet'), T('Repair Details'), T('Repair Date'), T('Bill Link')]).concat([OSD()]) },
  { name: 'Almirah Details', prefix: 'ALM', grp: G3, fields: furn([T('Material'), T('Size'), T('Key No.')]) },
  { name: 'Sofa Details', prefix: 'SOF', grp: G3, fields: furn([T('Seater'), T('Colour')]) },
  { name: 'Bags Details', prefix: 'BAG', grp: G3, fields: furn([T('Brand'), T('Type'), T('Colour')]) },

  // Appliances
  { name: 'AC Details', prefix: 'AC', grp: G4, fields: appl([T('Capacity (Ton)'), S('AC Type', ['Split', 'Split Hot & Cold', 'Window', 'Cassette', 'Tower']), T('Star Rating'), T('Gas Type'),
    T('Old Code'), T('Purchased In Company'), T('Bill Link'), T('History Card Link')]).concat([OSD()]) },
  { name: 'Fan Details', prefix: 'FAN', grp: G4, fields: appl([S('Fan Type', ['Ceiling', 'Wall', 'Exhaust', 'Pedestal', 'Table', 'Tower', 'Cooler']), T('Size (mm)'),
    T('Item Name'), T('Old Code'), D('Issue Date'), T('Repair Details'), T('Bill Link')]).concat([OSD()]) },
  { name: 'Heater Detail', prefix: 'HTR', grp: G4, fields: appl([S('Heater Type', ['Room Heater', 'Oil Filled', 'Blower', 'Water Heater / Geyser']), T('Wattage')]) },
  { name: 'Fridge Details', prefix: 'FRG', grp: G4, fields: appl([T('Capacity (L)'), T('Door Type'),
    T('Item Name'), T('Old Code'), T('Warranty (as in sheet)'), T('Expected Life'), T('Repair Details'), T('Repair Bill'), T('Bill Link')]).concat([OSD()]) },
  { name: 'Water Dispenser Sheet & RO / Water Purifier', prefix: 'WTR', grp: G4, fields: appl([
    S('Equipment', ['Water Dispenser', 'RO Purifier', 'Water Cooler', 'Water Purifier']), D('Last Service Date'), D('Filter Changed On')]) },

  // Premises & Utilities
  { name: 'Asset of Meera Bagh', prefix: 'MBA', grp: G5, fields: [
    T('Asset Name'), T('Asset Category'), T('Brand / Make'), T('Model No.'), T('Size / Capacity / Type'), T('Serial No.'), T('Location'), T('Assigned To'),
    S('Condition', ['New', 'Good', 'Fair', 'Poor']), D('Purchase Date'), T('Vendor'), M('Purchase Cost (₹)'),
    D('Warranty Till', { expiry: true }), A('Warranty / Bill Notes'), T('Bill Link'), T('Old Code'), A('Remarks'), OSD()] },
  { name: 'WGs Combid details', prefix: 'WGC', grp: G5, fields: [
    T('Item'), T('Description'), T('Location'), T('Assigned To'), D('Date'), N('Quantity'), A('Remarks')] },
  { name: 'Electricity, Water Reading & Wastage Sheet', prefix: 'UTL', grp: G5, fields: [
    D('Reading Date'), S('Utility', ['Electricity', 'Water']), T('Meter No.'), T('Location'), N('Reading'),
    N('Units Consumed'), N('Wastage'), M('Bill Amount (₹)'), A('Remarks')] },
  { name: 'Kitchen stock record', prefix: 'KIT', grp: G5, fields: [
    T('Item'), T('Unit'), N('Opening Stock'), N('Received'), N('Consumed'), N('Closing Stock'), D('Date'), T('Supplier'), A('Remarks')] },

  // Records & Attendance
  { name: 'Attendance sheets hard copy', prefix: 'ATH', grp: G6, fields: [
    T('Month'), T('Office / Location'), N('Pages'), T('Storage Location / File No.'), T('Received From'), D('Received On'), A('Remarks')] },
  { name: 'Attendance Summary Details', prefix: 'ATS', grp: G6, fields: [
    T('Month'), T('Office / Location'), N('Total Employees'), N('Working Days'), N('Present Days'), N('Absent Days'), N('Leave Days'), A('Remarks')] },

  // Vendors & Contacts
  { name: 'Vendor List', prefix: 'VEN', grp: G7, fields: [
    T('Vendor Name'), T('Supplies / Service'), T('Contact Person'), T('Phone'), T('Email'),
    T('GST No.'), T('City'), A('Address'), A('Remarks')] },
  { name: 'Contact Details', prefix: 'CON', grp: G7, fields: [
    T('Name'), T('Designation'), T('Organisation'), T('Phone'), T('Email'), T('City'), A('Address'), A('Remarks')] },
].map((c, i) => ({ ...c, sort: i }));
