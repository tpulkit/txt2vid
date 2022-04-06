dataset_name = "Txt2Vid Subjective Study"
ref_score = 0

ref_videos = [{'content_id': 1, 'content_name': 'AM'},
 {'content_id': 2, 'content_name': 'MS'},
 {'content_id': 3, 'content_name': 'PP'},
 {'content_id': 4, 'content_name': 'PT'},
 {'content_id': 5, 'content_name': 'SC'},
 {'content_id': 6, 'content_name': 'YL'}]

dis_videos = [{'asset_id': 0,
  'content_id': 6,
  'os': {('subj_106', 14): 1,
         ('subj_112', 14): 1,
         ('subj_112', 15): 1,
         ('subj_119', 15): 1,
         ('subj_135', 14): 1,
         ('subj_135', 15): 1,
         ('subj_148', 14): 1,
         ('subj_148', 15): 1,
         ('subj_155', 14): 1,
         ('subj_155', 15): 1,
         ('subj_16', 14): 1,
         ('subj_16', 15): 1,
         ('subj_163', 14): 1,
         ('subj_163', 15): 1,
         ('subj_177', 15): 1,
         ('subj_187', 14): 1,
         ('subj_19', 14): 1,
         ('subj_19', 15): 1,
         ('subj_191', 15): 1,
         ('subj_201', 14): 1,
         ('subj_201', 15): 1,
         ('subj_21', 14): 1,
         ('subj_21', 15): 1,
         ('subj_214', 14): 1,
         ('subj_222', 14): 1,
         ('subj_228', 14): 1,
         ('subj_26', 14): 1,
         ('subj_26', 15): 1,
         ('subj_29', 14): 1,
         ('subj_29', 15): 1,
         ('subj_31', 15): 1,
         ('subj_36', 14): 1,
         ('subj_36', 15): 1,
         ('subj_39', 14): 1,
         ('subj_42', 14): 1,
         ('subj_42', 15): 1,
         ('subj_51', 14): 1,
         ('subj_51', 15): 1,
         ('subj_58', 14): 1,
         ('subj_72', 14): 1,
         ('subj_72', 15): 1,
         ('subj_85', 14): 1,
         ('subj_91', 15): 1,
         ('subj_95', 14): 1,
         ('subj_95', 15): 1,
         ('subj_99', 14): 1,
         ('subj_99', 15): 1},
  'path': 'YL_AV1_crf60_AAC_br10_ds2_us2_bitrateV_8054_bitrateA_10152.mp4'},
 {'asset_id': 1,
  'content_id': 6,
  'os': {('subj_112', 14): 1,
         ('subj_112', 15): 1,
         ('subj_119', 15): 1,
         ('subj_135', 14): 1,
         ('subj_135', 15): 1,
         ('subj_155', 14): 1,
         ('subj_155', 15): 1,
         ('subj_16', 14): 1,
         ('subj_16', 15): 1,
         ('subj_163', 14): 1,
         ('subj_163', 15): 1,
         ('subj_165', 15): 1,
         ('subj_177', 14): 1,
         ('subj_187', 14): 1,
         ('subj_19', 14): 1,
         ('subj_19', 15): 1,
         ('subj_195', 14): 1,
         ('subj_201', 15): 1,
         ('subj_21', 14): 1,
         ('subj_21', 15): 1,
         ('subj_26', 15): 1,
         ('subj_29', 14): 1,
         ('subj_29', 15): 1,
         ('subj_31', 15): 1,
         ('subj_42', 14): 1,
         ('subj_49', 14): 1,
         ('subj_51', 14): 1,
         ('subj_51', 15): 1,
         ('subj_58', 14): 1,
         ('subj_58', 15): 1,
         ('subj_72', 14): 1,
         ('subj_72', 15): 1,
         ('subj_95', 14): 1,
         ('subj_95', 15): 1,
         ('subj_99', 14): 1,
         ('subj_99', 15): 1},
  'path': 'YL_AV1_crf60_AAC_br5_ds2_us2_bitrateV_8054_bitrateA_5294.mp4'},
 {'asset_id': 2,
  'content_id': 6,
  'os': {('subj_10', 14): 1,
         ('subj_106', 14): 1,
         ('subj_112', 14): 1,
         ('subj_112', 15): 1,
         ('subj_119', 14): 1,
         ('subj_119', 15): 1,
         ('subj_124', 14): 1,
         ('subj_135', 14): 1,
         ('subj_135', 15): 1,
         ('subj_148', 14): 1,
         ('subj_148', 15): 1,
         ('subj_155', 14): 1,
         ('subj_155', 15): 1,
         ('subj_16', 14): 1,
         ('subj_16', 15): 1,
         ('subj_163', 14): 1,
         ('subj_163', 15): 1,
         ('subj_165', 14): 1,
         ('subj_174', 14): 1,
         ('subj_177', 14): 1,
         ('subj_177', 15): 1,
         ('subj_183', 14): 1,
         ('subj_183', 15): 1,
         ('subj_189', 14): 1,
         ('subj_189', 15): 1,
         ('subj_19', 14): 1,
         ('subj_19', 15): 1,
         ('subj_195', 14): 1,
         ('subj_201', 14): 1,
         ('subj_201', 15): 1,
         ('subj_21', 14): 1,
         ('subj_21', 15): 1,
         ('subj_214', 15): 1,
         ('subj_222', 15): 1,
         ('subj_228', 15): 1,
         ('subj_26', 14): 1,
         ('subj_26', 15): 1,
         ('subj_29', 14): 1,
         ('subj_29', 15): 1,
         ('subj_31', 14): 1,
         ('subj_31', 15): 1,
         ('subj_36', 14): 1,
         ('subj_39', 14): 1,
         ('subj_39', 15): 1,
         ('subj_42', 14): 1,
         ('subj_42', 15): 1,
         ('subj_49', 14): 1,
         ('subj_51', 14): 1,
         ('subj_51', 15): 1,
         ('subj_66', 14): 1,
         ('subj_69', 14): 1,
         ('subj_72', 15): 1,
         ('subj_91', 14): 1,
         ('subj_95', 14): 1,
         ('subj_95', 15): 1,
         ('subj_99', 14): 1,
         ('subj_99', 15): 1},
  'path': 'YL_AV1_crf63_AAC_br10_ds1_us1_bitrateV_11413_bitrateA_10152.mp4'},
 {'asset_id': 3,
  'content_id': 6,
  'os': {('subj_106', 14): 1,
         ('subj_112', 14): 1,
         ('subj_112', 15): 1,
         ('subj_119', 14): 1,
         ('subj_124', 14): 1,
         ('subj_135', 14): 1,
         ('subj_148', 14): 1,
         ('subj_148', 15): 1,
         ('subj_155', 15): 1,
         ('subj_16', 14): 1,
         ('subj_16', 15): 1,
         ('subj_163', 14): 1,
         ('subj_163', 15): 1,
         ('subj_19', 14): 1,
         ('subj_195', 14): 1,
         ('subj_201', 14): 1,
         ('subj_201', 15): 1,
         ('subj_222', 14): 1,
         ('subj_222', 15): 1,
         ('subj_26', 14): 1,
         ('subj_26', 15): 1,
         ('subj_29', 14): 1,
         ('subj_29', 15): 1,
         ('subj_31', 14): 1,
         ('subj_42', 14): 1,
         ('subj_42', 15): 1,
         ('subj_51', 14): 1,
         ('subj_51', 15): 1,
         ('subj_58', 14): 1,
         ('subj_66', 14): 1,
         ('subj_69', 14): 1,
         ('subj_72', 15): 1,
         ('subj_85', 14): 1,
         ('subj_91', 15): 1,
         ('subj_95', 14): 1,
         ('subj_95', 15): 1,
         ('subj_99', 14): 1},
  'path': 'YL_AV1_crf63_AAC_br10_ds2_us2_bitrateV_6658_bitrateA_10152.mp4'},
 {'asset_id': 4,
  'content_id': 6,
  'os': {('subj_10', 14): 1,
         ('subj_112', 14): 1,
         ('subj_112', 15): 1,
         ('subj_119', 14): 1,
         ('subj_119', 15): 1,
         ('subj_124', 15): 1,
         ('subj_135', 15): 1,
         ('subj_155', 14): 1,
         ('subj_155', 15): 1,
         ('subj_16', 14): 1,
         ('subj_16', 15): 1,
         ('subj_163', 14): 1,
         ('subj_163', 15): 1,
         ('subj_165', 14): 1,
         ('subj_177', 14): 1,
         ('subj_177', 15): 1,
         ('subj_183', 14): 1,
         ('subj_19', 14): 1,
         ('subj_19', 15): 1,
         ('subj_191', 14): 1,
         ('subj_191', 15): 1,
         ('subj_201', 14): 1,
         ('subj_201', 15): 1,
         ('subj_21', 14): 1,
         ('subj_21', 15): 1,
         ('subj_215', 15): 1,
         ('subj_222', 14): 1,
         ('subj_228', 14): 1,
         ('subj_26', 15): 1,
         ('subj_29', 14): 1,
         ('subj_29', 15): 1,
         ('subj_31', 14): 1,
         ('subj_36', 15): 1,
         ('subj_39', 14): 1,
         ('subj_39', 15): 1,
         ('subj_42', 14): 1,
         ('subj_42', 15): 1,
         ('subj_49', 14): 1,
         ('subj_51', 14): 1,
         ('subj_51', 15): 1,
         ('subj_58', 15): 1,
         ('subj_72', 14): 1,
         ('subj_72', 15): 1,
         ('subj_95', 14): 1,
         ('subj_95', 15): 1,
         ('subj_99', 14): 1,
         ('subj_99', 15): 1},
  'path': 'YL_AV1_crf63_AAC_br5_ds1_us1_bitrateV_11413_bitrateA_5294.mp4'},
 {'asset_id': 5,
  'content_id': 6,
  'os': {('subj_119', 15): 1,
         ('subj_148', 14): 1,
         ('subj_155', 14): 1,
         ('subj_155', 15): 1,
         ('subj_16', 14): 1,
         ('subj_16', 15): 1,
         ('subj_163', 14): 1,
         ('subj_163', 15): 1,
         ('subj_177', 15): 1,
         ('subj_189', 14): 1,
         ('subj_19', 15): 1,
         ('subj_201', 14): 1,
         ('subj_201', 15): 1,
         ('subj_21', 14): 1,
         ('subj_21', 15): 1,
         ('subj_214', 14): 1,
         ('subj_222', 14): 1,
         ('subj_26', 14): 1,
         ('subj_26', 15): 1,
         ('subj_36', 15): 1,
         ('subj_42', 14): 1,
         ('subj_42', 15): 1,
         ('subj_49', 14): 1,
         ('subj_51', 14): 1,
         ('subj_51', 15): 1,
         ('subj_72', 14): 1,
         ('subj_72', 15): 1,
         ('subj_91', 15): 1,
         ('subj_95', 14): 1,
         ('subj_95', 15): 1,
         ('subj_99', 14): 1},
  'path': 'YL_AV1_crf63_AAC_br5_ds2_us2_bitrateV_6658_bitrateA_5294.mp4'},
 {'asset_id': 6,
  'content_id': 6,
  'os': {('subj_10', 14): 1,
         ('subj_106', 14): 1,
         ('subj_112', 14): 1,
         ('subj_112', 15): 1,
         ('subj_119', 14): 1,
         ('subj_119', 15): 1,
         ('subj_124', 14): 1,
         ('subj_135', 14): 1,
         ('subj_135', 15): 1,
         ('subj_148', 14): 1,
         ('subj_148', 15): 1,
         ('subj_155', 14): 1,
         ('subj_155', 15): 1,
         ('subj_16', 14): 1,
         ('subj_16', 15): 1,
         ('subj_163', 14): 1,
         ('subj_163', 15): 1,
         ('subj_165', 14): 1,
         ('subj_165', 15): 1,
         ('subj_174', 14): 1,
         ('subj_174', 15): 1,
         ('subj_177', 15): 1,
         ('subj_183', 14): 1,
         ('subj_187', 14): 1,
         ('subj_189', 14): 1,
         ('subj_19', 14): 1,
         ('subj_19', 15): 1,
         ('subj_191', 15): 1,
         ('subj_201', 14): 1,
         ('subj_201', 15): 1,
         ('subj_21', 14): 1,
         ('subj_21', 15): 1,
         ('subj_215', 14): 1,
         ('subj_222', 15): 1,
         ('subj_228', 14): 1,
         ('subj_232', 14): 1,
         ('subj_26', 14): 1,
         ('subj_29', 14): 1,
         ('subj_29', 15): 1,
         ('subj_31', 14): 1,
         ('subj_36', 14): 1,
         ('subj_39', 14): 1,
         ('subj_39', 15): 1,
         ('subj_42', 14): 1,
         ('subj_42', 15): 1,
         ('subj_49', 14): 1,
         ('subj_51', 14): 1,
         ('subj_51', 15): 1,
         ('subj_69', 14): 1,
         ('subj_72', 15): 1,
         ('subj_85', 14): 1,
         ('subj_91', 14): 1,
         ('subj_95', 14): 1,
         ('subj_95', 15): 1,
         ('subj_99', 14): 1,
         ('subj_99', 15): 1},
  'path': 'YL_AVC_crf26_AAC_br10_ds2_us2_bitrateV_122218_bitrateA_10152.mp4'},
 {'asset_id': 7,
  'content_id': 6,
  'os': {('subj_10', 14): 1,
         ('subj_112', 14): 1,
         ('subj_112', 15): 1,
         ('subj_119', 14): 1,
         ('subj_119', 15): 1,
         ('subj_135', 14): 1,
         ('subj_135', 15): 1,
         ('subj_155', 14): 1,
         ('subj_155', 15): 1,
         ('subj_16', 14): 1,
         ('subj_16', 15): 1,
         ('subj_163', 14): 1,
         ('subj_163', 15): 1,
         ('subj_165', 14): 1,
         ('subj_165', 15): 1,
         ('subj_174', 14): 1,
         ('subj_177', 14): 1,
         ('subj_177', 15): 1,
         ('subj_183', 14): 1,
         ('subj_183', 15): 1,
         ('subj_19', 14): 1,
         ('subj_19', 15): 1,
         ('subj_191', 14): 1,
         ('subj_191', 15): 1,
         ('subj_201', 14): 1,
         ('subj_201', 15): 1,
         ('subj_21', 14): 1,
         ('subj_21', 15): 1,
         ('subj_222', 14): 1,
         ('subj_222', 15): 1,
         ('subj_26', 14): 1,
         ('subj_26', 15): 1,
         ('subj_29', 14): 1,
         ('subj_29', 15): 1,
         ('subj_31', 15): 1,
         ('subj_36', 14): 1,
         ('subj_39', 14): 1,
         ('subj_39', 15): 1,
         ('subj_42', 14): 1,
         ('subj_42', 15): 1,
         ('subj_51', 14): 1,
         ('subj_51', 15): 1,
         ('subj_58', 15): 1,
         ('subj_72', 15): 1,
         ('subj_91', 14): 1,
         ('subj_91', 15): 1,
         ('subj_95', 14): 1,
         ('subj_95', 15): 1,
         ('subj_99', 14): 1,
         ('subj_99', 15): 1},
  'path': 'YL_AVC_crf26_AAC_br5_ds2_us2_bitrateV_122218_bitrateA_5294.mp4'},
 {'asset_id': 8,
  'content_id': 6,
  'os': {('subj_10', 14): 1,
         ('subj_10', 15): 1,
         ('subj_112', 14): 1,
         ('subj_112', 15): 1,
         ('subj_119', 14): 1,
         ('subj_119', 15): 1,
         ('subj_135', 14): 1,
         ('subj_135', 15): 1,
         ('subj_148', 14): 1,
         ('subj_148', 15): 1,
         ('subj_155', 14): 1,
         ('subj_155', 15): 1,
         ('subj_16', 14): 1,
         ('subj_16', 15): 1,
         ('subj_163', 14): 1,
         ('subj_163', 15): 1,
         ('subj_165', 14): 1,
         ('subj_165', 15): 1,
         ('subj_167', 14): 1,
         ('subj_174', 15): 1,
         ('subj_177', 14): 1,
         ('subj_177', 15): 1,
         ('subj_183', 14): 1,
         ('subj_183', 15): 1,
         ('subj_189', 14): 1,
         ('subj_19', 14): 1,
         ('subj_19', 15): 1,
         ('subj_191', 14): 1,
         ('subj_201', 14): 1,
         ('subj_201', 15): 1,
         ('subj_21', 14): 1,
         ('subj_21', 15): 1,
         ('subj_215', 14): 1,
         ('subj_222', 15): 1,
         ('subj_228', 14): 1,
         ('subj_232', 14): 1,
         ('subj_26', 14): 1,
         ('subj_26', 15): 1,
         ('subj_29', 14): 1,
         ('subj_29', 15): 1,
         ('subj_31', 15): 1,
         ('subj_39', 14): 1,
         ('subj_39', 15): 1,
         ('subj_42', 15): 1,
         ('subj_49', 14): 1,
         ('subj_51', 14): 1,
         ('subj_51', 15): 1,
         ('subj_58', 14): 1,
         ('subj_69', 14): 1,
         ('subj_69', 15): 1,
         ('subj_72', 14): 1,
         ('subj_72', 15): 1,
         ('subj_85', 14): 1,
         ('subj_91', 14): 1,
         ('subj_95', 14): 1,
         ('subj_95', 15): 1,
         ('subj_99', 14): 1,
         ('subj_99', 15): 1},
  'path': 'YL_AVC_crf28_AAC_br10_ds2_us2_bitrateV_76922_bitrateA_10152.mp4'},
 {'asset_id': 9,
  'content_id': 6,
  'os': {('subj_112', 14): 1,
         ('subj_112', 15): 1,
         ('subj_119', 14): 1,
         ('subj_119', 15): 1,
         ('subj_124', 15): 1,
         ('subj_135', 14): 1,
         ('subj_135', 15): 1,
         ('subj_155', 15): 1,
         ('subj_16', 14): 1,
         ('subj_16', 15): 1,
         ('subj_163', 14): 1,
         ('subj_163', 15): 1,
         ('subj_165', 14): 1,
         ('subj_167', 14): 1,
         ('subj_177', 15): 1,
         ('subj_183', 14): 1,
         ('subj_19', 14): 1,
         ('subj_19', 15): 1,
         ('subj_191', 14): 1,
         ('subj_191', 15): 1,
         ('subj_201', 14): 1,
         ('subj_201', 15): 1,
         ('subj_21', 14): 1,
         ('subj_21', 15): 1,
         ('subj_215', 14): 1,
         ('subj_222', 14): 1,
         ('subj_222', 15): 1,
         ('subj_29', 14): 1,
         ('subj_29', 15): 1,
         ('subj_39', 14): 1,
         ('subj_39', 15): 1,
         ('subj_42', 14): 1,
         ('subj_51', 14): 1,
         ('subj_51', 15): 1,
         ('subj_72', 14): 1,
         ('subj_72', 15): 1,
         ('subj_91', 15): 1,
         ('subj_95', 14): 1,
         ('subj_95', 15): 1,
         ('subj_99', 14): 1,
         ('subj_99', 15): 1},
  'path': 'YL_AVC_crf28_AAC_br5_ds2_us2_bitrateV_76922_bitrateA_5294.mp4'},
 {'asset_id': 10,
  'content_id': 6,
  'os': {('subj_10', 14): 1,
         ('subj_106', 14): 1,
         ('subj_112', 14): 1,
         ('subj_112', 15): 1,
         ('subj_119', 14): 1,
         ('subj_119', 15): 1,
         ('subj_124', 15): 1,
         ('subj_135', 14): 1,
         ('subj_135', 15): 1,
         ('subj_148', 14): 1,
         ('subj_148', 15): 1,
         ('subj_155', 14): 1,
         ('subj_155', 15): 1,
         ('subj_16', 14): 1,
         ('subj_16', 15): 1,
         ('subj_163', 14): 1,
         ('subj_163', 15): 1,
         ('subj_165', 14): 1,
         ('subj_165', 15): 1,
         ('subj_167', 14): 1,
         ('subj_177', 14): 1,
         ('subj_183', 15): 1,
         ('subj_187', 14): 1,
         ('subj_189', 14): 1,
         ('subj_19', 14): 1,
         ('subj_19', 15): 1,
         ('subj_195', 14): 1,
         ('subj_201', 14): 1,
         ('subj_201', 15): 1,
         ('subj_21', 15): 1,
         ('subj_222', 15): 1,
         ('subj_228', 14): 1,
         ('subj_228', 15): 1,
         ('subj_232', 14): 1,
         ('subj_26', 14): 1,
         ('subj_26', 15): 1,
         ('subj_29', 14): 1,
         ('subj_29', 15): 1,
         ('subj_31', 14): 1,
         ('subj_36', 14): 1,
         ('subj_39', 14): 1,
         ('subj_39', 15): 1,
         ('subj_42', 14): 1,
         ('subj_42', 15): 1,
         ('subj_49', 14): 1,
         ('subj_51', 14): 1,
         ('subj_51', 15): 1,
         ('subj_58', 14): 1,
         ('subj_58', 15): 1,
         ('subj_66', 14): 1,
         ('subj_66', 15): 1,
         ('subj_69', 14): 1,
         ('subj_69', 15): 1,
         ('subj_72', 14): 1,
         ('subj_72', 15): 1,
         ('subj_85', 14): 1,
         ('subj_91', 15): 1,
         ('subj_95', 14): 1,
         ('subj_95', 15): 1,
         ('subj_99', 14): 1,
         ('subj_99', 15): 1},
  'path': 'YL_AVC_crf30_AAC_br10_ds2_us2_bitrateV_48072_bitrateA_10152.mp4'},
 {'asset_id': 11,
  'content_id': 6,
  'os': {('subj_10', 14): 1,
         ('subj_112', 14): 1,
         ('subj_112', 15): 1,
         ('subj_119', 14): 1,
         ('subj_119', 15): 1,
         ('subj_135', 14): 1,
         ('subj_135', 15): 1,
         ('subj_155', 14): 1,
         ('subj_155', 15): 1,
         ('subj_16', 14): 1,
         ('subj_16', 15): 1,
         ('subj_163', 14): 1,
         ('subj_163', 15): 1,
         ('subj_165', 14): 1,
         ('subj_177', 14): 1,
         ('subj_183', 14): 1,
         ('subj_183', 15): 1,
         ('subj_187', 14): 1,
         ('subj_19', 14): 1,
         ('subj_19', 15): 1,
         ('subj_191', 14): 1,
         ('subj_191', 15): 1,
         ('subj_201', 14): 1,
         ('subj_201', 15): 1,
         ('subj_21', 14): 1,
         ('subj_21', 15): 1,
         ('subj_214', 14): 1,
         ('subj_222', 15): 1,
         ('subj_228', 14): 1,
         ('subj_26', 14): 1,
         ('subj_26', 15): 1,
         ('subj_29', 14): 1,
         ('subj_29', 15): 1,
         ('subj_31', 14): 1,
         ('subj_36', 14): 1,
         ('subj_39', 14): 1,
         ('subj_39', 15): 1,
         ('subj_42', 14): 1,
         ('subj_42', 15): 1,
         ('subj_49', 14): 1,
         ('subj_51', 14): 1,
         ('subj_51', 15): 1,
         ('subj_58', 14): 1,
         ('subj_72', 14): 1,
         ('subj_72', 15): 1,
         ('subj_91', 14): 1,
         ('subj_91', 15): 1,
         ('subj_95', 14): 1,
         ('subj_95', 15): 1,
         ('subj_99', 14): 1,
         ('subj_99', 15): 1},
  'path': 'YL_AVC_crf30_AAC_br5_ds2_us2_bitrateV_48072_bitrateA_5294.mp4'},
 {'asset_id': 12,
  'content_id': 6,
  'os': {('subj_112', 15): 1,
         ('subj_119', 15): 1,
         ('subj_135', 14): 1,
         ('subj_135', 15): 1,
         ('subj_148', 14): 1,
         ('subj_148', 15): 1,
         ('subj_155', 15): 1,
         ('subj_16', 14): 1,
         ('subj_16', 15): 1,
         ('subj_163', 14): 1,
         ('subj_163', 15): 1,
         ('subj_165', 14): 1,
         ('subj_167', 15): 1,
         ('subj_177', 14): 1,
         ('subj_187', 15): 1,
         ('subj_19', 14): 1,
         ('subj_19', 15): 1,
         ('subj_191', 14): 1,
         ('subj_201', 14): 1,
         ('subj_201', 15): 1,
         ('subj_21', 15): 1,
         ('subj_222', 15): 1,
         ('subj_26', 15): 1,
         ('subj_29', 14): 1,
         ('subj_29', 15): 1,
         ('subj_36', 14): 1,
         ('subj_36', 15): 1,
         ('subj_39', 15): 1,
         ('subj_42', 14): 1,
         ('subj_42', 15): 1,
         ('subj_51', 14): 1,
         ('subj_51', 15): 1,
         ('subj_66', 14): 1,
         ('subj_72', 14): 1,
         ('subj_72', 15): 1,
         ('subj_85', 14): 1,
         ('subj_91', 14): 1,
         ('subj_91', 15): 1,
         ('subj_95', 14): 1,
         ('subj_95', 15): 1,
         ('subj_99', 14): 1},
  'path': 'YL_AVC_crf32_AAC_br10_ds4_us4_bitrateV_9116_bitrateA_10152.mp4'},
 {'asset_id': 13,
  'content_id': 6,
  'os': {('subj_112', 15): 1,
         ('subj_124', 14): 1,
         ('subj_135', 15): 1,
         ('subj_148', 15): 1,
         ('subj_155', 15): 1,
         ('subj_16', 14): 1,
         ('subj_16', 15): 1,
         ('subj_163', 14): 1,
         ('subj_163', 15): 1,
         ('subj_19', 14): 1,
         ('subj_19', 15): 1,
         ('subj_201', 14): 1,
         ('subj_201', 15): 1,
         ('subj_21', 14): 1,
         ('subj_21', 15): 1,
         ('subj_222', 15): 1,
         ('subj_26', 14): 1,
         ('subj_29', 14): 1,
         ('subj_29', 15): 1,
         ('subj_39', 15): 1,
         ('subj_42', 14): 1,
         ('subj_51', 15): 1,
         ('subj_72', 15): 1,
         ('subj_91', 14): 1,
         ('subj_91', 15): 1,
         ('subj_95', 14): 1,
         ('subj_95', 15): 1,
         ('subj_99', 14): 1,
         ('subj_99', 15): 1},
  'path': 'YL_AVC_crf32_AAC_br5_ds4_us4_bitrateV_9116_bitrateA_5294.mp4'},
 {'asset_id': 14,
  'content_id': 6,
  'os': {('subj_10', 0): 1,
         ('subj_10', 1): 1,
         ('subj_10', 3): 1,
         ('subj_10', 5): 1,
         ('subj_10', 9): 1,
         ('subj_10', 12): 1,
         ('subj_10', 13): 1,
         ('subj_106', 1): 1,
         ('subj_106', 4): 1,
         ('subj_106', 5): 1,
         ('subj_106', 7): 1,
         ('subj_106', 8): 1,
         ('subj_106', 9): 1,
         ('subj_106', 11): 1,
         ('subj_106', 12): 1,
         ('subj_106', 13): 1,
         ('subj_112', 5): 1,
         ('subj_112', 12): 1,
         ('subj_112', 13): 1,
         ('subj_119', 0): 1,
         ('subj_119', 1): 1,
         ('subj_119', 5): 1,
         ('subj_119', 12): 1,
         ('subj_119', 13): 1,
         ('subj_124', 0): 1,
         ('subj_124', 1): 1,
         ('subj_124', 4): 1,
         ('subj_124', 5): 1,
         ('subj_124', 7): 1,
         ('subj_124', 8): 1,
         ('subj_124', 9): 1,
         ('subj_124', 10): 1,
         ('subj_124', 11): 1,
         ('subj_124', 12): 1,
         ('subj_135', 4): 1,
         ('subj_135', 5): 1,
         ('subj_135', 13): 1,
         ('subj_148', 1): 1,
         ('subj_148', 4): 1,
         ('subj_148', 7): 1,
         ('subj_148', 9): 1,
         ('subj_148', 11): 1,
         ('subj_148', 13): 1,
         ('subj_155', 3): 1,
         ('subj_155', 9): 1,
         ('subj_155', 12): 1,
         ('subj_155', 13): 1,
         ('subj_165', 0): 1,
         ('subj_165', 1): 1,
         ('subj_165', 3): 1,
         ('subj_165', 5): 1,
         ('subj_165', 13): 1,
         ('subj_167', 0): 1,
         ('subj_167', 1): 1,
         ('subj_167', 2): 1,
         ('subj_167', 3): 1,
         ('subj_167', 4): 1,
         ('subj_167', 5): 1,
         ('subj_167', 6): 1,
         ('subj_167', 7): 1,
         ('subj_167', 11): 1,
         ('subj_167', 12): 1,
         ('subj_167', 13): 1,
         ('subj_174', 0): 1,
         ('subj_174', 1): 1,
         ('subj_174', 3): 1,
         ('subj_174', 4): 1,
         ('subj_174', 5): 1,
         ('subj_174', 8): 1,
         ('subj_174', 9): 1,
         ('subj_174', 10): 1,
         ('subj_174', 11): 1,
         ('subj_174', 12): 1,
         ('subj_174', 13): 1,
         ('subj_177', 0): 1,
         ('subj_177', 3): 1,
         ('subj_177', 5): 1,
         ('subj_177', 6): 1,
         ('subj_177', 9): 1,
         ('subj_177', 13): 1,
         ('subj_183', 0): 1,
         ('subj_183', 1): 1,
         ('subj_183', 3): 1,
         ('subj_183', 5): 1,
         ('subj_183', 10): 1,
         ('subj_183', 12): 1,
         ('subj_183', 13): 1,
         ('subj_187', 2): 1,
         ('subj_187', 3): 1,
         ('subj_187', 4): 1,
         ('subj_187', 5): 1,
         ('subj_187', 7): 1,
         ('subj_187', 8): 1,
         ('subj_187', 9): 1,
         ('subj_187', 12): 1,
         ('subj_187', 13): 1,
         ('subj_189', 0): 1,
         ('subj_189', 1): 1,
         ('subj_189', 3): 1,
         ('subj_189', 4): 1,
         ('subj_189', 7): 1,
         ('subj_189', 9): 1,
         ('subj_189', 11): 1,
         ('subj_189', 12): 1,
         ('subj_189', 13): 1,
         ('subj_19', 5): 1,
         ('subj_191', 0): 1,
         ('subj_191', 1): 1,
         ('subj_191', 2): 1,
         ('subj_191', 3): 1,
         ('subj_191', 5): 1,
         ('subj_191', 6): 1,
         ('subj_191', 10): 1,
         ('subj_191', 13): 1,
         ('subj_195', 0): 1,
         ('subj_195', 4): 1,
         ('subj_195', 5): 1,
         ('subj_195', 6): 1,
         ('subj_195', 7): 1,
         ('subj_195', 8): 1,
         ('subj_195', 9): 1,
         ('subj_195', 11): 1,
         ('subj_195', 12): 1,
         ('subj_195', 13): 1,
         ('subj_201', 1): 1,
         ('subj_21', 3): 1,
         ('subj_21', 10): 1,
         ('subj_21', 12): 1,
         ('subj_214', 1): 1,
         ('subj_214', 2): 1,
         ('subj_214', 3): 1,
         ('subj_214', 4): 1,
         ('subj_214', 6): 1,
         ('subj_214', 7): 1,
         ('subj_214', 8): 1,
         ('subj_214', 9): 1,
         ('subj_214', 10): 1,
         ('subj_214', 12): 1,
         ('subj_214', 13): 1,
         ('subj_215', 0): 1,
         ('subj_215', 1): 1,
         ('subj_215', 2): 1,
         ('subj_215', 3): 1,
         ('subj_215', 4): 1,
         ('subj_215', 5): 1,
         ('subj_215', 7): 1,
         ('subj_215', 10): 1,
         ('subj_215', 11): 1,
         ('subj_215', 12): 1,
         ('subj_215', 13): 1,
         ('subj_222', 1): 1,
         ('subj_222', 2): 1,
         ('subj_222', 6): 1,
         ('subj_222', 8): 1,
         ('subj_222', 10): 1,
         ('subj_222', 11): 1,
         ('subj_222', 12): 1,
         ('subj_222', 13): 1,
         ('subj_228', 1): 1,
         ('subj_228', 2): 1,
         ('subj_228', 3): 1,
         ('subj_228', 5): 1,
         ('subj_228', 7): 1,
         ('subj_228', 9): 1,
         ('subj_228', 12): 1,
         ('subj_228', 13): 1,
         ('subj_232', 0): 1,
         ('subj_232', 1): 1,
         ('subj_232', 2): 1,
         ('subj_232', 3): 1,
         ('subj_232', 4): 1,
         ('subj_232', 5): 1,
         ('subj_232', 7): 1,
         ('subj_232', 9): 1,
         ('subj_232', 11): 1,
         ('subj_232', 12): 1,
         ('subj_232', 13): 1,
         ('subj_26', 1): 1,
         ('subj_26', 4): 1,
         ('subj_26', 9): 1,
         ('subj_26', 12): 1,
         ('subj_29', 5): 1,
         ('subj_31', 0): 1,
         ('subj_31', 1): 1,
         ('subj_31', 5): 1,
         ('subj_31', 7): 1,
         ('subj_31', 8): 1,
         ('subj_31', 9): 1,
         ('subj_31', 12): 1,
         ('subj_31', 13): 1,
         ('subj_36', 1): 1,
         ('subj_36', 3): 1,
         ('subj_36', 4): 1,
         ('subj_36', 5): 1,
         ('subj_36', 8): 1,
         ('subj_36', 9): 1,
         ('subj_36', 13): 1,
         ('subj_39', 1): 1,
         ('subj_39', 3): 1,
         ('subj_39', 5): 1,
         ('subj_39', 12): 1,
         ('subj_39', 13): 1,
         ('subj_42', 8): 1,
         ('subj_49', 0): 1,
         ('subj_49', 3): 1,
         ('subj_49', 7): 1,
         ('subj_49', 9): 1,
         ('subj_49', 12): 1,
         ('subj_49', 13): 1,
         ('subj_51', 13): 1,
         ('subj_58', 2): 1,
         ('subj_58', 4): 1,
         ('subj_58', 5): 1,
         ('subj_58', 6): 1,
         ('subj_58', 7): 1,
         ('subj_58', 9): 1,
         ('subj_58', 12): 1,
         ('subj_58', 13): 1,
         ('subj_66', 0): 1,
         ('subj_66', 1): 1,
         ('subj_66', 4): 1,
         ('subj_66', 5): 1,
         ('subj_66', 6): 1,
         ('subj_66', 7): 1,
         ('subj_66', 8): 1,
         ('subj_66', 9): 1,
         ('subj_66', 11): 1,
         ('subj_66', 13): 1,
         ('subj_69', 0): 1,
         ('subj_69', 1): 1,
         ('subj_69', 4): 1,
         ('subj_69', 5): 1,
         ('subj_69', 7): 1,
         ('subj_69', 9): 1,
         ('subj_69', 11): 1,
         ('subj_69', 12): 1,
         ('subj_69', 13): 1,
         ('subj_72', 2): 1,
         ('subj_72', 3): 1,
         ('subj_72', 6): 1,
         ('subj_72', 7): 1,
         ('subj_72', 13): 1,
         ('subj_85', 1): 1,
         ('subj_85', 2): 1,
         ('subj_85', 4): 1,
         ('subj_85', 5): 1,
         ('subj_85', 7): 1,
         ('subj_85', 9): 1,
         ('subj_85', 11): 1,
         ('subj_85', 13): 1,
         ('subj_91', 0): 1,
         ('subj_91', 1): 1,
         ('subj_91', 3): 1,
         ('subj_91', 4): 1,
         ('subj_91', 5): 1,
         ('subj_91', 9): 1,
         ('subj_91', 10): 1},
  'path': 'YL_driving_video_AVC_crf20_original_audio_br10.mp4'},
 {'asset_id': 15,
  'content_id': 6,
  'os': {('subj_10', 0): 1,
         ('subj_10', 1): 1,
         ('subj_10', 2): 1,
         ('subj_10', 3): 1,
         ('subj_10', 4): 1,
         ('subj_10', 5): 1,
         ('subj_10', 6): 1,
         ('subj_10', 7): 1,
         ('subj_10', 9): 1,
         ('subj_10', 10): 1,
         ('subj_10', 11): 1,
         ('subj_10', 12): 1,
         ('subj_10', 13): 1,
         ('subj_106', 0): 1,
         ('subj_106', 1): 1,
         ('subj_106', 2): 1,
         ('subj_106', 3): 1,
         ('subj_106', 4): 1,
         ('subj_106', 5): 1,
         ('subj_106', 6): 1,
         ('subj_106', 7): 1,
         ('subj_106', 8): 1,
         ('subj_106', 9): 1,
         ('subj_106', 10): 1,
         ('subj_106', 11): 1,
         ('subj_106', 12): 1,
         ('subj_106', 13): 1,
         ('subj_112', 5): 1,
         ('subj_119', 3): 1,
         ('subj_119', 13): 1,
         ('subj_124', 0): 1,
         ('subj_124', 1): 1,
         ('subj_124', 2): 1,
         ('subj_124', 3): 1,
         ('subj_124', 5): 1,
         ('subj_124', 6): 1,
         ('subj_124', 7): 1,
         ('subj_124', 8): 1,
         ('subj_124', 11): 1,
         ('subj_124', 12): 1,
         ('subj_124', 13): 1,
         ('subj_135', 3): 1,
         ('subj_135', 5): 1,
         ('subj_148', 1): 1,
         ('subj_148', 4): 1,
         ('subj_148', 5): 1,
         ('subj_148', 7): 1,
         ('subj_148', 9): 1,
         ('subj_148', 11): 1,
         ('subj_165', 0): 1,
         ('subj_165', 2): 1,
         ('subj_165', 3): 1,
         ('subj_165', 4): 1,
         ('subj_165', 5): 1,
         ('subj_165', 9): 1,
         ('subj_165', 11): 1,
         ('subj_165', 12): 1,
         ('subj_165', 13): 1,
         ('subj_167', 0): 1,
         ('subj_167', 1): 1,
         ('subj_167', 2): 1,
         ('subj_167', 3): 1,
         ('subj_167', 4): 1,
         ('subj_167', 5): 1,
         ('subj_167', 6): 1,
         ('subj_167', 7): 1,
         ('subj_167', 8): 1,
         ('subj_167', 9): 1,
         ('subj_167', 10): 1,
         ('subj_167', 11): 1,
         ('subj_167', 13): 1,
         ('subj_174', 0): 1,
         ('subj_174', 1): 1,
         ('subj_174', 2): 1,
         ('subj_174', 3): 1,
         ('subj_174', 4): 1,
         ('subj_174', 5): 1,
         ('subj_174', 7): 1,
         ('subj_174', 9): 1,
         ('subj_174', 10): 1,
         ('subj_174', 11): 1,
         ('subj_174', 12): 1,
         ('subj_174', 13): 1,
         ('subj_177', 1): 1,
         ('subj_177', 3): 1,
         ('subj_177', 10): 1,
         ('subj_177', 11): 1,
         ('subj_177', 12): 1,
         ('subj_177', 13): 1,
         ('subj_183', 0): 1,
         ('subj_183', 1): 1,
         ('subj_183', 3): 1,
         ('subj_183', 4): 1,
         ('subj_183', 5): 1,
         ('subj_183', 6): 1,
         ('subj_183', 9): 1,
         ('subj_183', 12): 1,
         ('subj_183', 13): 1,
         ('subj_187', 0): 1,
         ('subj_187', 1): 1,
         ('subj_187', 2): 1,
         ('subj_187', 3): 1,
         ('subj_187', 4): 1,
         ('subj_187', 5): 1,
         ('subj_187', 6): 1,
         ('subj_187', 7): 1,
         ('subj_187', 8): 1,
         ('subj_187', 9): 1,
         ('subj_187', 10): 1,
         ('subj_187', 11): 1,
         ('subj_187', 13): 1,
         ('subj_189', 0): 1,
         ('subj_189', 1): 1,
         ('subj_189', 3): 1,
         ('subj_189', 4): 1,
         ('subj_189', 5): 1,
         ('subj_189', 6): 1,
         ('subj_189', 7): 1,
         ('subj_189', 8): 1,
         ('subj_189', 9): 1,
         ('subj_189', 10): 1,
         ('subj_189', 11): 1,
         ('subj_189', 12): 1,
         ('subj_189', 13): 1,
         ('subj_19', 3): 1,
         ('subj_191', 1): 1,
         ('subj_191', 2): 1,
         ('subj_191', 3): 1,
         ('subj_191', 5): 1,
         ('subj_191', 8): 1,
         ('subj_191', 10): 1,
         ('subj_191', 12): 1,
         ('subj_191', 13): 1,
         ('subj_195', 0): 1,
         ('subj_195', 1): 1,
         ('subj_195', 2): 1,
         ('subj_195', 3): 1,
         ('subj_195', 4): 1,
         ('subj_195', 5): 1,
         ('subj_195', 6): 1,
         ('subj_195', 7): 1,
         ('subj_195', 8): 1,
         ('subj_195', 9): 1,
         ('subj_195', 10): 1,
         ('subj_195', 11): 1,
         ('subj_195', 12): 1,
         ('subj_195', 13): 1,
         ('subj_21', 3): 1,
         ('subj_214', 0): 1,
         ('subj_214', 1): 1,
         ('subj_214', 3): 1,
         ('subj_214', 4): 1,
         ('subj_214', 5): 1,
         ('subj_214', 6): 1,
         ('subj_214', 7): 1,
         ('subj_214', 8): 1,
         ('subj_214', 9): 1,
         ('subj_214', 10): 1,
         ('subj_214', 11): 1,
         ('subj_214', 12): 1,
         ('subj_214', 13): 1,
         ('subj_215', 0): 1,
         ('subj_215', 1): 1,
         ('subj_215', 2): 1,
         ('subj_215', 3): 1,
         ('subj_215', 5): 1,
         ('subj_215', 6): 1,
         ('subj_215', 7): 1,
         ('subj_215', 8): 1,
         ('subj_215', 9): 1,
         ('subj_215', 10): 1,
         ('subj_215', 11): 1,
         ('subj_215', 12): 1,
         ('subj_215', 13): 1,
         ('subj_222', 0): 1,
         ('subj_222', 1): 1,
         ('subj_222', 4): 1,
         ('subj_222', 5): 1,
         ('subj_228', 0): 1,
         ('subj_228', 1): 1,
         ('subj_228', 3): 1,
         ('subj_228', 4): 1,
         ('subj_228', 5): 1,
         ('subj_228', 6): 1,
         ('subj_228', 7): 1,
         ('subj_228', 8): 1,
         ('subj_228', 9): 1,
         ('subj_228', 11): 1,
         ('subj_228', 12): 1,
         ('subj_228', 13): 1,
         ('subj_232', 0): 1,
         ('subj_232', 1): 1,
         ('subj_232', 2): 1,
         ('subj_232', 3): 1,
         ('subj_232', 4): 1,
         ('subj_232', 5): 1,
         ('subj_232', 6): 1,
         ('subj_232', 7): 1,
         ('subj_232', 8): 1,
         ('subj_232', 9): 1,
         ('subj_232', 10): 1,
         ('subj_232', 11): 1,
         ('subj_232', 12): 1,
         ('subj_232', 13): 1,
         ('subj_26', 6): 1,
         ('subj_26', 9): 1,
         ('subj_26', 13): 1,
         ('subj_29', 5): 1,
         ('subj_31', 3): 1,
         ('subj_31', 4): 1,
         ('subj_31', 5): 1,
         ('subj_31', 6): 1,
         ('subj_31', 9): 1,
         ('subj_31', 10): 1,
         ('subj_31', 11): 1,
         ('subj_31', 12): 1,
         ('subj_31', 13): 1,
         ('subj_36', 1): 1,
         ('subj_36', 2): 1,
         ('subj_36', 3): 1,
         ('subj_36', 6): 1,
         ('subj_36', 7): 1,
         ('subj_36', 8): 1,
         ('subj_36', 9): 1,
         ('subj_36', 10): 1,
         ('subj_36', 11): 1,
         ('subj_36', 13): 1,
         ('subj_39', 0): 1,
         ('subj_39', 1): 1,
         ('subj_39', 3): 1,
         ('subj_39', 5): 1,
         ('subj_42', 1): 1,
         ('subj_42', 9): 1,
         ('subj_42', 13): 1,
         ('subj_49', 0): 1,
         ('subj_49', 1): 1,
         ('subj_49', 2): 1,
         ('subj_49', 3): 1,
         ('subj_49', 4): 1,
         ('subj_49', 5): 1,
         ('subj_49', 6): 1,
         ('subj_49', 7): 1,
         ('subj_49', 8): 1,
         ('subj_49', 9): 1,
         ('subj_49', 10): 1,
         ('subj_49', 11): 1,
         ('subj_49', 12): 1,
         ('subj_49', 13): 1,
         ('subj_58', 0): 1,
         ('subj_58', 2): 1,
         ('subj_58', 3): 1,
         ('subj_58', 5): 1,
         ('subj_58', 6): 1,
         ('subj_58', 8): 1,
         ('subj_58', 9): 1,
         ('subj_58', 11): 1,
         ('subj_58', 12): 1,
         ('subj_58', 13): 1,
         ('subj_66', 0): 1,
         ('subj_66', 1): 1,
         ('subj_66', 2): 1,
         ('subj_66', 3): 1,
         ('subj_66', 4): 1,
         ('subj_66', 5): 1,
         ('subj_66', 6): 1,
         ('subj_66', 7): 1,
         ('subj_66', 8): 1,
         ('subj_66', 9): 1,
         ('subj_66', 11): 1,
         ('subj_66', 12): 1,
         ('subj_66', 13): 1,
         ('subj_69', 0): 1,
         ('subj_69', 1): 1,
         ('subj_69', 2): 1,
         ('subj_69', 3): 1,
         ('subj_69', 4): 1,
         ('subj_69', 5): 1,
         ('subj_69', 6): 1,
         ('subj_69', 7): 1,
         ('subj_69', 9): 1,
         ('subj_69', 11): 1,
         ('subj_69', 12): 1,
         ('subj_69', 13): 1,
         ('subj_85', 0): 1,
         ('subj_85', 1): 1,
         ('subj_85', 2): 1,
         ('subj_85', 3): 1,
         ('subj_85', 4): 1,
         ('subj_85', 5): 1,
         ('subj_85', 6): 1,
         ('subj_85', 7): 1,
         ('subj_85', 8): 1,
         ('subj_85', 9): 1,
         ('subj_85', 10): 1,
         ('subj_85', 11): 1,
         ('subj_85', 12): 1,
         ('subj_85', 13): 1,
         ('subj_91', 1): 1,
         ('subj_91', 2): 1,
         ('subj_91', 4): 1,
         ('subj_91', 6): 1,
         ('subj_91', 8): 1,
         ('subj_99', 3): 1,
         ('subj_99', 5): 1,
         ('subj_99', 12): 1},
  'path': 'YL_driving_video_AVC_crf20_resemble_audio.mp4'}]
