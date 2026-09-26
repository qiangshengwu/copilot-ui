# =============================================================================
# copilot web 前端镜像（多阶段构建）
# 构建上下文 = 前端工程根（本目录）
# nginx 站点配置（nginx.conf）随镜像内嵌，不再依赖外部 bind-mount。
# =============================================================================

# ---------- 构建阶段 ----------
# node:22-alpine 与工程约定（Node 22 / npm / UmiJS4）对齐
FROM node:22-alpine AS builder

WORKDIR /app

# 先拷依赖清单以利用层缓存。
COPY package.json ./
COPY package-lock.json* ./

# --no-audit/--no-fund 减少构建日志噪音。
# --ignore-scripts：此刻只拷了 package.json（无 tsconfig/config），postinstall=umi setup 可能失败；
#   umi build 会自行重新生成 .umi，跳过 postinstall 无副作用。
RUN npm install --no-audit --no-fund --ignore-scripts

# 拷入其余源码并构建（umi build -> 产物落在 /app/dist）
COPY . .
RUN npm run build

# ---------- 运行阶段 ----------
FROM nginx:alpine

# SPA 静态产物
COPY --from=builder /app/dist /usr/share/nginx/html

# nginx 站点配置（SPA 回退 + /{workspaceID} 租户路由反代 agent），见 nginx.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
