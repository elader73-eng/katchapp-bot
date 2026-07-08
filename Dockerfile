FROM ghcr.io/puppeteer/puppeteer:22.0.0

# הגדרת תיקיית העבודה
WORKDIR /app

# העתקה והתקנה של החבילות
COPY package*.json ./
RUN npm install

# העתקת שאר קבצי הקוד
COPY . .

# פקודת ההרצה של הבוט
CMD ["node", "app.js"]
