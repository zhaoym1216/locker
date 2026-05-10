export const COMPANY_DOMAINS: Record<string, string> = {
  'alibaba.com': '阿里巴巴',
  'taobao.com': '阿里巴巴',
  'antfin.com': '蚂蚁集团',
  'tencent.com': '腾讯',
  'qq.com': '腾讯',
  'baidu.com': '百度',
  'bytedance.com': '字节跳动',
  'toutiao.com': '字节跳动',
  'douyin.com': '字节跳动',
  'jd.com': '京东',
  'meituan.com': '美团',
  'didi.com': '滴滴',
  'xiaomi.com': '小米',
  'huawei.com': '华为',
  'oppo.com': 'OPPO',
  'vivo.com': 'vivo',
  'netease.com': '网易',
  '163.com': '网易',
  'weibo.com': '新浪',
  'sina.com': '新浪',
  'sohu.com': '搜狐',
  'pinduoduo.com': '拼多多',
  'kuaishou.com': '快手',
  'bilibili.com': '哔哩哔哩',
  'xiaohongshu.com': '小红书',
  'zhihu.com': '知乎',
  'douban.com': '豆瓣',
  'ctrip.com': '携程',
  'trip.com': '携程',
  'alipay.com': '蚂蚁集团',
  'pingan.com': '平安集团',
  'icbc.com': '工商银行',
  'ccb.com': '建设银行',
  'bankcomm.com': '交通银行',
  'cmbchina.com': '招商银行',
  'amazon.com': '亚马逊',
  'microsoft.com': '微软',
  'google.com': '谷歌',
  'apple.com': '苹果',
  'meta.com': 'Meta',
  'facebook.com': 'Meta',
  'twitter.com': 'X',
  'x.com': 'X',
};

export const SCHOOL_DOMAINS: Record<string, string> = {
  'tsinghua.edu.cn': '清华大学',
  'pku.edu.cn': '北京大学',
  'fudan.edu.cn': '复旦大学',
  'sjtu.edu.cn': '上海交通大学',
  'zju.edu.cn': '浙江大学',
  'nju.edu.cn': '南京大学',
  'ustc.edu.cn': '中国科学技术大学',
  'hit.edu.cn': '哈尔滨工业大学',
  'whu.edu.cn': '武汉大学',
  'hust.edu.cn': '华中科技大学',
  'scu.edu.cn': '四川大学',
  'xjtu.edu.cn': '西安交通大学',
  'nankai.edu.cn': '南开大学',
  'tju.edu.cn': '天津大学',
  'seu.edu.cn': '东南大学',
  'sysu.edu.cn': '中山大学',
  'xmu.edu.cn': '厦门大学',
  'ruc.edu.cn': '中国人民大学',
  'buaa.edu.cn': '北京航空航天大学',
  'bit.edu.cn': '北京理工大学',
  'nwpu.edu.cn': '西北工业大学',
  'dlut.edu.cn': '大连理工大学',
  'csu.edu.cn': '中南大学',
  'ouc.edu.cn': '中国海洋大学',
  'lzu.edu.cn': '兰州大学',
  'uestc.edu.cn': '电子科技大学',
  'bupt.edu.cn': '北京邮电大学',
  'edu.cn': '中国高校', // 通用 .edu.cn 域名
};

export function lookupDomain(email: string): { type: 'COMPANY' | 'SCHOOL'; name: string } | null {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return null;

  if (SCHOOL_DOMAINS[domain]) {
    return { type: 'SCHOOL', name: SCHOOL_DOMAINS[domain] };
  }

  // .edu.cn 结尾但不在表中，仍视为学校
  if (domain.endsWith('.edu.cn')) {
    const name = domain.replace('.edu.cn', '').split('.').pop() || domain;
    return { type: 'SCHOOL', name: name + '大学' };
  }

  if (COMPANY_DOMAINS[domain]) {
    return { type: 'COMPANY', name: COMPANY_DOMAINS[domain] };
  }

  return null;
}
