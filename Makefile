# =============================================================================
# copilot web 前端构建/运行（独立部署，不依赖根 compose）
# 镜像 prefix 与根 Makefile（copilot 仓库根）保持一致。
# run：宿主 9090 -> 容器 80；--add-host 使容器内 host.docker.internal 指向宿主，
#      nginx.conf 反代 agent（宿主机 9091）依赖此解析。
# =============================================================================

override LT_DOCKER_IMAGE_NAME_PREFIX := crpi-n68v5vsgyo3vr4da.cn-hangzhou.personal.cr.aliyuncs.com/linkedti

.PHONY: build up run stop

build:
	docker build -t $(LT_DOCKER_IMAGE_NAME_PREFIX)/web:latest .

up: run

run:
	docker run -d --name copilot-web -p 9090:80 --add-host host.docker.internal:host-gateway $(LT_DOCKER_IMAGE_NAME_PREFIX)/web:latest

stop:
	-docker rm -f copilot-web
