# **App Name**: BatteryView

## Core Features:

- Tiered Dashboard UI: Single-page dashboard with a tiered structure: high-level overview, detailed metrics, and historical trends.
- Multi-File Upload: Allow users to upload multiple BMS screenshot files at once.
- Image Data Extraction: Automatically extract key data points (Battery ID, SOC, Voltage, Current, etc.) from user-uploaded screenshots using a vision model.
- Multi-Battery Support: Automatically detect Battery ID from each screenshot and store data in dedicated collections.
- Intelligent Timestamping: Use an editable date field for historical context; extract time directly from each screenshot.
- Hourly Averaging: For multiple uploads within the same hour, average the numerical values (e.g., Amp draw, Voltage) and store a single data point.
- Automated Alerts: Display prominent alerts for major data deviations (e.g., rapid SOC drop or high voltage difference).

## Style Guidelines:

- Primary color: Deep sky blue (#3498DB) to reflect battery power in a cool and techy style.
- Background color: Light gray (#ECF0F1) for a clean and neutral backdrop.
- Accent color: Orange (#E67E22) to draw attention to key data and alerts.
- Body and headline font: 'Inter', a sans-serif font for a modern and readable UI.
- Use clean and simple vector icons to represent different metrics and functions.
- Implement a responsive layout that adapts to different screen sizes, ensuring readability and usability on all devices.
- Use subtle transitions and animations to enhance user experience when data is updated or new alerts are displayed.