INSERT OR IGNORE INTO mining_models (model, type, category, tflops, watts, price, ai_score, vram, description, sort_order) VALUES
('s19xp','asic','asic',0,3150,300000,0,0,'Antminer S19 XP 140TH/s',100),
('s19kpro','asic','asic',0,3150,250000,0,0,'Antminer S19k Pro 136TH/s',101),
('s21','asic','asic',0,3500,500000,0,0,'Antminer S21 200TH/s',110),
('s21pro','asic','asic',0,3510,600000,0,0,'Antminer S21 Pro 234TH/s',111),
('s21hyd','asic','asic',0,5360,800000,0,0,'Antminer S21 Hyd 335TH/s',112),
('m50s','asic','asic',0,3275,200000,0,0,'Whatsminer M50S 126TH/s',105),
('m56sp','asic','asic',0,5550,550000,0,0,'Whatsminer M56S+ 212TH/s',108),
('m60','asic','asic',0,3420,450000,0,0,'Whatsminer M60 186TH/s',109),
('m66s','asic','asic',0,5500,750000,0,0,'Whatsminer M66S 298TH/s',113);

INSERT OR IGNORE INTO mining_models (model, type, category, tflops, watts, price, ai_score, vram, description, sort_order) VALUES
('rack_12u','rack','infra',0,0,15000,0,0,'機櫃 12U (4 GPU / 1 ASIC)',200),
('rack_42u','rack','infra',0,0,50000,0,0,'機櫃 42U (16 GPU / 2 ASIC)',201),
('psu_1000','psu','infra',0,0,3000,0,0,'電源 1000W',210),
('psu_2000','psu','infra',0,0,8000,0,0,'電源 2000W',211),
('psu_3000','psu','infra',0,0,12000,0,0,'電源 3000W',212),
('fan','cooler','infra',0,0,10000,0,0,'散熱風扇 -5% 電費',220),
('liquid_cool','cooler','infra',0,0,50000,0,0,'液冷系統 -25% 電費',221),
('ups','ups','infra',0,0,20000,0,0,'UPS 不斷電 10分鐘',230),
('switch_10g','switch','infra',0,0,8000,0,0,'10G 交換器 -10% AI延遲',240);

INSERT OR IGNORE INTO mining_models (model, type, category, tflops, watts, price, ai_score, vram, description, sort_order) VALUES
('cuda','software','sw',0,0,0,0,0,'CUDA Toolkit (免費)',250),
('tensorrt','software','sw',0,0,20000,0,0,'TensorRT +30% AI收入',251),
('vllm','software','sw',0,0,50000,0,0,'vLLM推理引擎 +50% AI收入',252),
('finetune','software','sw',0,0,100000,0,0,'模型微調工具 解鎖高階合約',253),
('scheduler','software','sw',0,0,30000,0,0,'自動排程 智能切換挖礦/AI',254);

INSERT OR IGNORE INTO mining_models (model, type, category, tflops, watts, price, ai_score, vram, description, sort_order) VALUES
('rack_studio','bundle','bundle',120,1000,230000,280,48,'小型工作室 4x4070+12U+PSU+風扇',300),
('rack_mine','bundle','bundle',664,3950,1160000,1600,192,'中型礦場 8x4090+42U+PSU+液冷',301),
('rack_asic_in','bundle','bundle',0,7000,1100000,0,0,'ASIC礦場入門 2xS21+12U+PSU+風扇',302),
('rack_asic_flag','bundle','bundle',0,21440,4200000,0,0,'ASIC礦場旗艦 4xS21Hyd+42U+液冷+UPS',303),
('rack_ai_chat','bundle','bundle',31.2,150,430000,144,24,'聊天機器人站 A10+12U+TensorRT+vLLM',310),
('rack_ai_img','bundle','bundle',166,1050,380000,520,48,'圖片生成站 2x4090+液冷+TensorRT',311),
('rack_ai_voice','bundle','bundle',312,400,1500000,1620,80,'語音辨識站 A100+液冷+vLLM',312),
('rack_ai_video','bundle','bundle',990,700,5500000,6000,80,'影片生成站 H100+42U+液冷+UPS',313),
('rack_ai_llm','bundle','bundle',3960,2800,18000000,24000,320,'LLM微調中心 4xH100+全套軟體',314),
('rack_hybrid_sm','bundle','bundle',166,1050,400000,520,48,'靈活工作站 2x4090+液冷+自動排程',320),
('rack_hybrid_md','bundle','bundle',494,2400,800000,920,128,'多棲礦場 4x4090+4x3060+自動排程',321),
('rack_hybrid_lg','bundle','bundle',2620,3500,8000000,9600,352,'混合大站 8x4090+2xA100+全套',322);

INSERT OR IGNORE INTO mining_models (model, type, category, tflops, watts, price, ai_score, vram, description, sort_order) VALUES
('cnc_basic','factory','mfg',0,500,200000,0,0,'CNC 基本型 +5% 產能',400),
('cnc_pro','factory','mfg',0,1200,600000,0,0,'CNC 專業型 +12% 產能',401),
('3dprinter','factory','mfg',0,200,50000,0,0,'3D 列印機 +3% 產能',402),
('robot_arm','factory','mfg',0,800,400000,0,0,'機械手臂 +10% 產能',403),
('assembly_line','factory','mfg',0,2000,800000,0,0,'自動組裝線 +15% 產能',404),
('laser_cutter','factory','mfg',0,600,300000,0,0,'雷射切割機 +8% 產能',405),
('press_machine','factory','mfg',0,1500,500000,0,0,'沖壓機 +10% 產能',406),
('quality_cam','factory','mfg',0,100,30000,0,0,'AI 品檢攝影機 -2% 廢品率',407),
('conveyor','factory','mfg',0,300,150000,0,0,'輸送帶系統 +5% 效率',408),
('cooling_tower','factory','mfg',0,0,100000,0,0,'冷卻塔 -10% 工廠電費',409);
