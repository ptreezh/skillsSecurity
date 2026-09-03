FROM node:24-alpine

WORKDIR /app

# 仅安装运行时依赖（express/multer/cors/ethers/uuid/js-yaml/dotenv）
COPY package*.json ./
RUN npm ci --omit=dev

# 复制后端运行所需文件
COPY server ./server
COPY src/abi ./src/abi
COPY deployments.json ./

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "server/index.js"]
