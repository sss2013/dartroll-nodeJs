FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# 의존성 설치를 위해 package 파일 먼저 복사 (빌드 캐시 활용)
COPY package*.json ./
RUN npm ci --only=production

# 앱 소스 복사
COPY . .

# non-root 사용자 생성 및 전환
RUN addgroup -S app && adduser -S app -G app
USER app

# 문서용 EXPOSE (Render는 내부 PORT 환경변수를 주입)
EXPOSE 3000

# Render는 start 스크립트를 사용하므로 package.json의 start가 node app.js를 실행해야 함
CMD ["npm", "run", "start"]