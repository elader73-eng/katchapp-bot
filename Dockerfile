FROM ghcr.io/puppeteer/puppeteer:latest

# הגדרת תיקיית העבודה
WORKDIR /app

# העתקה והתקנה של החבילות
COPY package*.json ./
RUN npm install

# העתקת שאר קבצי הקוד
COPY . .

# פקודת ההרצה של הבוט
CMD ["node", "app.js"]
