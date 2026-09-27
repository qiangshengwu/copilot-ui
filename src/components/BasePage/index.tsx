import { PageContainer } from '@ant-design/pro-components';
import { useEmotionCss } from '@ant-design/use-emotion-css';
import React, { useEffect, useState } from 'react';

export interface BasePageProps {
  /**
   * 是否显示面包屑
   *
   * 默认 true
   */
  breadcrumb?: boolean;
  /**
   * 页面内容
   *
   * 可以直接传 ReactNode，
   * 也可以通过函数获取计算后的 contentHeight。
   */
  children: React.ReactNode | ((contentHeight: number) => React.ReactNode);

  /**
   * Layout Header 高度
   *
   * 默认 48px
   */
  headerHeight?: number;

  /**
   * Layout Breadcrumb 高度
   *
   * 默认 48px
   */
  breadcrumbHeight?: number;

  /**
   * 页面内边距
   *
   * 默认 12px
   */
  padding?: number;

  /** 自定义 className */
  className?: string;
}

const BasePage: React.FC<BasePageProps> = ({
  children,
  breadcrumb = false,
  headerHeight = 48,
  padding = 16,
  breadcrumbHeight = 48,
  className,
}) => {
  const [contentHeight, setContentHeight] = useState(0);

  /**
   * 计算页面实际可用高度
   *
   * viewport
   *   ↓
   * - headerHeight
   *   ↓
   * - padding * 2
   *   ↓
   * contentHeight
   */
  useEffect(() => {
    const updateHeight = () => {
      const height = window.innerHeight - headerHeight - (breadcrumb ? breadcrumbHeight : 0);

      setContentHeight(Math.max(height, 0));
    };

    updateHeight();

    window.addEventListener('resize', updateHeight);

    return () => {
      window.removeEventListener('resize', updateHeight);
    };
  }, [headerHeight, padding, breadcrumb]);

  /**
   * PageContainer
   */
  const containerClassName = useEmotionCss(() => ({
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: `calc(100vh - ${headerHeight}px)`,
    minHeight: 0,
    '.ant-pro-page-container-children-container': {
      display: 'flex',
      flexDirection: 'column',
      padding: 0,
      minHeight: 0,
    },
  }));

  /**
   * 内容容器
   */
  const contentClassName = useEmotionCss(() => ({
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: contentHeight,
    minHeight: 0,
    padding: padding,
    boxSizing: 'border-box',
    overflow: 'hidden',
    // 整体内容最外层四个角统一 12px 圆角（overflow:hidden 使子内容随圆角裁剪）
    borderRadius: 12,
  }));

  /**
   * 支持：
   *
   * <BasePage>
   *   <Component />
   * </BasePage>
   *
   * 以及：
   *
   * <BasePage>
   *   {(height) => <Component height={height} />}
   * </BasePage>
   */
  const content = typeof children === 'function' ? children(contentHeight) : children;

  // title:false 已让 PageContainer 不渲染 header（含面包屑），无需传 breadcrumb:false
  // （breadcrumb 类型为 BreadcrumbProps，传 false 会类型报错）
  const props = {
    className: `${containerClassName} ${className ?? ''}`,
    title: false,
  };

  return (
    <PageContainer {...props}>
      <div className={contentClassName}>{content}</div>
    </PageContainer>
  );
};

export default BasePage;
