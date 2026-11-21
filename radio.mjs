/**
 * Pocket Immersion Radio Engine (15.3.0)
 * Turns built-in YouTube motivational speeches, NotebookLM spoken phrases & dialogues,
 * and the learner's active daily pack / local history into a hands-free, lock-screen
 * friendly English audio stream with:
 * - Gemini TTS priority + single unlocked <audio> channel + next-track prefetch
 * - Exact single-segment Kokoro `af_heart` MP3 offline fallback (`segments: string[]`)
 * - Watchdog-protected speechSynthesis fallback (prevents iOS Safari track-3 stalls)
 * - 4 streamlined channels: Weak Sniper, YouTube Motivational Speeches,
 *   Sentences & Listening, and Notebook Spoken Phrases & Dialogues
 * - Independent playback speed toggle (0.8x bedtime slow / 0.9x standard / 1.0x normal)
 * - Scope selector (`today` vs `all` history), stop-after-round, shuffle, shadowing pause & sleep timer
 *
 * CRITICAL INTEGRITY RULE:
 * Passive radio listening is tracked strictly as audio exposure (`exposureOnly: true`)
 * and NEVER counts as K or independent retrieval mastery.
 */

const cleanRad = value => String(value ?? '').replace(/\r/g, '').trim();

export const RADIO_CHANNELS = Object.freeze([
  { id: 'speaking_qa', label: '🎤 口语问答·同步字幕', desc: '导入 YouTube 真人口语 MP3 + SRT/VTT 字幕或问答 ZIP，支持实时滚动高亮、Q&A 问完停顿与盲答' },
  { id: 'youtube_speeches', label: '🎬 YouTube 励志演讲', desc: '精选 YouTube 经典励志演讲原声字幕分段，用 Gemini 语音流畅连播' },
  { id: 'sentences_listening', label: '🎧 句子与听力精磨', desc: '专攻完整英文句子与听力语段，适合影子跟读' },
  { id: 'notebook_spoken', label: '📓 Notebook 口语与对话', desc: '内置美音连读短语、词根高频口语与地道长对话，随时可找 Gemini 更新曲库' }
]);

export const RADIO_SPEED_PRESETS = Object.freeze([
  { rate: 0.8, label: '🐢 语速：0.8× 睡前慢速' },
  { rate: 0.9, label: '🎧 语速：0.9× 清晰标准' },
  { rate: 1.0, label: '⚡ 语速：1.0× 原速常听' }
]);

/**
 * Curated YouTube Motivational Speech library (transcript-grounded, public sources).
 * Update this array anytime to refresh the learner's built-in YouTube Walkman feed.
 */
export const BUILT_IN_YOUTUBE_SPEECHES = Object.freeze([
  // Admiral William H. McRaven — UT Austin 2014 Commencement ("Make Your Bed")
  {
    id: 'yt:mcraven:01',
    badge: 'YouTube 励志 · McRaven',
    title: 'Make Your Bed Every Morning',
    text: 'If you make your bed every morning, you will have accomplished the first task of the day. It will give you a small sense of pride, and it will encourage you to do another task, and another, and another.',
    subtext: '每天早上叠好被子，完成当天第一件事，小成就感会带动一整天的正向连锁反应 · UT Austin 2014',
    sourceUrl: 'https://www.youtube.com/watch?v=yaQZFhrW0fU'
  },
  {
    id: 'yt:mcraven:02',
    badge: 'YouTube 励志 · McRaven',
    title: 'The Little Things in Life Matter',
    text: 'Making your bed will also reinforce the fact that the little things in life matter. If you cannot do the little things right, you will never be able to do the big things right.',
    subtext: '把小事做好，才有能力把大事做好；哪怕度过糟糕的一天，回家还有一张自己叠好的床给你明日的希望',
    sourceUrl: 'https://www.youtube.com/watch?v=yaQZFhrW0fU'
  },
  {
    id: 'yt:mcraven:03',
    badge: 'YouTube 励志 · McRaven',
    title: 'Find Someone to Help You Paddle',
    text: 'You cannot change the world alone. You will need some help. To truly get from your starting point to your destination takes friends, colleagues, the goodwill of strangers, and a strong coxswain to guide you.',
    subtext: '你无法独自改变世界，去找到愿意和你一起划桨的同伴与引路人',
    sourceUrl: 'https://www.youtube.com/watch?v=yaQZFhrW0fU'
  },
  {
    id: 'yt:mcraven:04',
    badge: 'YouTube 励志 · McRaven',
    title: 'Measure a Person by the Size of Their Heart',
    text: 'Nothing mattered but your will to succeed—not your color, not your ethnic background, not your education, not your social status. If you want to change the world, measure a person by the size of their heart, not by the size of their flippers.',
    subtext: '衡量一个人的不是出身或外表，而是内心的格局与成功的意志',
    sourceUrl: 'https://www.youtube.com/watch?v=yaQZFhrW0fU'
  },
  {
    id: 'yt:mcraven:05',
    badge: 'YouTube 励志 · McRaven',
    title: 'Get Over Being a Sugar Cookie',
    text: 'Sometimes, no matter how well you prepare or how well you perform, you still end up as a sugar cookie. It is just the way life is sometimes. If you want to change the world, get over being a sugar cookie and keep moving forward.',
    subtext: '生活有时就是不公平，哪怕准备充分仍会受挫——别停在委屈里，继续往前走',
    sourceUrl: 'https://www.youtube.com/watch?v=yaQZFhrW0fU'
  },
  {
    id: 'yt:mcraven:06',
    badge: 'YouTube 励志 · McRaven',
    title: 'Do Not Be Afraid of the Circuses',
    text: 'Life is filled with circuses. You will fail. You will likely fail often. It will be painful and discouraging, and at times it will test you to your very core. Over time, the pain builds inner strength and physical resiliency.',
    subtext: '把每一次“加练与失败”当成锻造内心韧性的熔炉，不要害怕挫折',
    sourceUrl: 'https://www.youtube.com/watch?v=yaQZFhrW0fU'
  },
  {
    id: 'yt:mcraven:07',
    badge: 'YouTube 励志 · McRaven',
    title: 'Be Your Very Best in the Darkest Moments',
    text: 'Every SEAL knows that under the keel, at that darkest moment of the mission, is a time when you must be calm and composed—when all your tactical skills, your physical power, and your inner strength must be brought to bear.',
    subtext: '在最黑暗、最容易迷失方向的时刻，恰恰需要你保持冷静、拿出最好的状态',
    sourceUrl: 'https://www.youtube.com/watch?v=yaQZFhrW0fU'
  },
  {
    id: 'yt:mcraven:08',
    badge: 'YouTube 励志 · McRaven',
    title: 'Start Singing When You Are Up to Your Neck in Mud',
    text: 'One voice began to echo through the night, raised in song. One voice became two, and before long everyone was singing. Somehow the mud seemed a little warmer, the wind a little tamer, and the dawn not so far away.',
    subtext: '身陷泥潭时唱起歌，一个人点燃的希望可以照亮整片黑夜，黎明就不远了',
    sourceUrl: 'https://www.youtube.com/watch?v=yaQZFhrW0fU'
  },
  {
    id: 'yt:mcraven:09',
    badge: 'YouTube 励志 · McRaven',
    title: 'Never, Ever Ring the Bell',
    text: 'All you have to do to quit is ring the bell. Ring the bell and you no longer have to wake up at five or endure the hardships of training. If you want to change the world, do not ever, ever ring the bell.',
    subtext: '放弃只需摇一下铃，但如果你想改变人生，永远不要按下放弃键',
    sourceUrl: 'https://www.youtube.com/watch?v=yaQZFhrW0fU'
  },
  // Denzel Washington — "Fall Forward" Motivational Speech
  {
    id: 'yt:denzel:01',
    badge: 'YouTube 励志 · Denzel',
    title: 'There Is No Passion in Playing Small',
    text: 'I found that nothing in life is worthwhile unless you take risks. Nelson Mandela said there is no passion to be found playing small, in settling for a life that is less than the one you are capable of living.',
    subtext: '人生中值得拥有的一切都需要敢于冒险；安于平庸、将就度日永远找不到真正的激情',
    sourceUrl: 'https://www.youtube.com/watch?v=tbnzAVRZ9Xc'
  },
  {
    id: 'yt:denzel:02',
    badge: 'YouTube 励志 · Denzel',
    title: 'Fall Forward, Not Fall Back',
    text: 'People tell you to make sure you have something to fall back on. But I never understood that concept. If I am going to fall, I do not want to fall back on anything—I want to fall forward. At least this way I will see what I am going to hit.',
    subtext: '不要总想着退路，就算跌倒也要向前倒，至少你能看清前方要去的地方',
    sourceUrl: 'https://www.youtube.com/watch?v=tbnzAVRZ9Xc'
  },
  {
    id: 'yt:denzel:03',
    badge: 'YouTube 励志 · Denzel',
    title: 'Dreams Without Goals Are Just Dreams',
    text: 'Without consistency, you will never finish. So do what you feel passionate about, take chances, and do not be afraid to think outside the box. Dream big, but remember: dreams without goals are just dreams.',
    subtext: '没有持续行动就永远到不了终点；没有具体目标的梦想只是空想',
    sourceUrl: 'https://www.youtube.com/watch?v=tbnzAVRZ9Xc'
  },
  {
    id: 'yt:denzel:04',
    badge: 'YouTube 励志 · Denzel',
    title: 'Every Failed Experiment Is One Step Closer',
    text: 'Reggie Jackson struck out twenty-six hundred times in his career, but people remember the home runs. Thomas Edison conducted one thousand failed experiments, because the one thousand and first was the light bulb. Every failed experiment is one step closer to success.',
    subtext: '人们记住的是全垒打和第 1001 次点亮的灯泡——每一次失败都让你离成功更近一步',
    sourceUrl: 'https://www.youtube.com/watch?v=tbnzAVRZ9Xc'
  },
  {
    id: 'yt:denzel:05',
    badge: 'YouTube 励志 · Denzel',
    title: 'Hang Around the Barbershop Long Enough',
    text: 'I did not quit. I walked out of there to prepare for the next audition, and the next audition. There is an old saying: you hang around the barbershop long enough, sooner or later you are going to get a haircut. So you will catch a break.',
    subtext: '只要一直在场、持续打磨，迟早会迎来属于你的突破时刻（catch a break）',
    sourceUrl: 'https://www.youtube.com/watch?v=tbnzAVRZ9Xc'
  },
  {
    id: 'yt:denzel:06',
    badge: 'YouTube 励志 · Denzel',
    title: 'If You Do Not Fail, You Are Not Even Trying',
    text: 'Every graduate here today has the training and the talent to succeed, but do you have the guts to fail? If you do not fail, you are not even trying. To get something you never had, you have to do something you never did.',
    subtext: '从不失败说明你根本没真正尝试；想得到从未拥有的，就要做从未做过的事',
    sourceUrl: 'https://www.youtube.com/watch?v=tbnzAVRZ9Xc'
  },
  {
    id: 'yt:denzel:07',
    badge: 'YouTube 励志 · Denzel',
    title: 'Never Hold Back, Give Everything You Got',
    text: 'Taking risks is not just about going for a job. It is about being open to people and to ideas. Never be discouraged, never hold back, give everything you got, and when you fall throughout life, remember this: fall forward.',
    subtext: '永远不要气馁，不要保留实力，全力以赴，跌倒时永远向前跌',
    sourceUrl: 'https://www.youtube.com/watch?v=tbnzAVRZ9Xc'
  },
  // Steve Jobs — Stanford 2005 Commencement Address
  {
    id: 'yt:jobs:01',
    badge: 'YouTube 励志 · Steve Jobs',
    title: 'You Can Only Connect the Dots Looking Backward',
    text: 'You cannot connect the dots looking forward; you can only connect them looking backward. So you have to trust that the dots will somehow connect in your future. Trusting that the dots will connect down the road gives you the confidence to follow your heart.',
    subtext: '往前看无法把点连成线，只有回头看才能恍然大悟；相信眼下的每一步积累都会在未来串联起来 · Stanford 2005',
    sourceUrl: 'https://www.youtube.com/watch?v=UF8uR6Z6KLc'
  },
  {
    id: 'yt:jobs:02',
    badge: 'YouTube 励志 · Steve Jobs',
    title: 'Keep Looking, Do Not Settle',
    text: 'The only way to do great work is to love what you do. If you have not found it yet, keep looking. Do not settle. As with all matters of the heart, you will know when you find it.',
    subtext: '做出伟大工作的唯一方式是热爱你所做的事；如果还没找到，就继续寻找，不要将就（do not settle）',
    sourceUrl: 'https://www.youtube.com/watch?v=UF8uR6Z6KLc'
  },
  {
    id: 'yt:jobs:03',
    badge: 'YouTube 励志 · Steve Jobs',
    title: 'Your Time Is Limited, Do Not Live Someone Else Life',
    text: 'Your time is limited, so do not waste it living someone else life. Do not let the noise of others opinions drown out your own inner voice. Have the courage to follow your heart and intuition.',
    subtext: '时间有限，别活在别人的眼光里；别让外界杂音淹没你内心的声音（drown out）',
    sourceUrl: 'https://www.youtube.com/watch?v=UF8uR6Z6KLc'
  },
  {
    id: 'yt:jobs:04',
    badge: 'YouTube 励志 · Steve Jobs',
    title: 'Stay Hungry, Stay Foolish',
    text: 'When I was young, there was an amazing publication with a photograph of an early morning country road. Beneath it were the words: Stay Hungry. Stay Foolish. I have always wished that for myself, and now I wish that for you.',
    subtext: '求知若饥，虚心若愚（Stay Hungry, Stay Foolish）——保持好奇与谦逊，持续精进',
    sourceUrl: 'https://www.youtube.com/watch?v=UF8uR6Z6KLc'
  }
,
  {
    id: "yt:mcraven:full:01",
    badge: "YouTube 励志 · McRaven",
    title: "What Starts Here Changes the World",
    text: "It has been almost thirty-seven years to the day that I graduated from UT. I remember I had a throbbing headache from a party the night before, I had a serious girlfriend whom I later married, and I was getting commissioned in the Navy that day. Of all the things I remember, I don't have a clue who the commencement speaker was. So if I can't make this commencement speech memorable, I will at least try to make it short. The university slogan is 'What starts here changes the world.' Tonight there are more than eight thousand students graduating from UT. If every one of you changed the lives of just ten people, and each one of those people changed the lives of another ten people, then in five generations—one hundred twenty-five years—the class of 2014 will have changed the lives of eight hundred million people. Go one more generation and you can change the entire population of the world: eight billion people.",
    subtext: "如果每个人一生只改变十个人，五代之后就能影响八亿人 · UT Austin 2014",
    sourceUrl: "https://www.youtube.com/watch?v=pxBQLFLei70"
  },
  {
    id: "yt:mcraven:full:02",
    badge: "YouTube 励志 · McRaven",
    title: "One Decision Can Save Generations",
    text: "If you think it's hard to change the lives of ten people forever, you're wrong. I saw it happen every day in Iraq and Afghanistan. A young army officer makes a decision to go left instead of right down a road in Baghdad, and the ten soldiers with him are saved from a close-in ambush. In Kandahar Province, a non-commissioned officer from the female engagement team senses that something isn't right and directs the infantry platoon away from a five-hundred-pound IED, saving the lives of a dozen soldiers. Not only were those soldiers saved by the decision of one person, but their children were saved, and their children's children. Generations were saved by one decision, one person. Changing the world can happen anywhere, and anyone can do it.",
    subtext: "一个人的关键判断，挽救的不只是眼前同伴，更是往后世世代代的生命",
    sourceUrl: "https://www.youtube.com/watch?v=pxBQLFLei70"
  },
  {
    id: "yt:mcraven:full:03",
    badge: "YouTube 励志 · McRaven",
    title: "Six Months of Basic SEAL Training",
    text: "While these lessons were learned during my time in the military, I can assure you that it matters not whether you ever served a day in uniform, your gender, your ethnic or religious background, or your social status. Our struggles in this world are similar, and the lessons to overcome those struggles apply equally to all. I have been a Navy SEAL for thirty-six years, but it all began when I left UT for basic SEAL training in Coronado, California. Basic SEAL training is six months of long torturous runs in the soft sand, midnight swims in the cold water off San Diego, obstacle courses, unending calisthenics, days without sleep, and always being cold, wet, and miserable. To me, basic SEAL training was a lifetime of challenges crammed into six months.",
    subtext: "海豹突击队六个月的魔鬼训练，把一生的艰难与混乱压缩进了半年里",
    sourceUrl: "https://www.youtube.com/watch?v=pxBQLFLei70"
  },
  {
    id: "yt:mcraven:full:04",
    badge: "YouTube 励志 · McRaven",
    title: "Lesson 1: Square Corners & Morning Pride",
    text: "Every morning in SEAL training, my instructors—who at the time were all Vietnam veterans—would show up in my barracks room, and the first thing they would do was inspect my bed. If you did it right, the corners would be square, the covers would be pulled tight, the pillow centered just under the headboard, and the extra blanket folded neatly at the foot of the rack. It was a simple task, mundane at best, but every morning we were required to make our bed to perfection. It seemed a little ridiculous at the time, particularly in light of the fact that we were aspiring to be tough, battle-hardened warriors. Yet the wisdom of this simple act has been proven to me many times over.",
    subtext: "哪怕是最平凡的叠被子，教官也要求做到极致，因为细节决定成败",
    sourceUrl: "https://www.youtube.com/watch?v=pxBQLFLei70"
  },
  {
    id: "yt:mcraven:full:05",
    badge: "YouTube 励志 · McRaven",
    title: "Lesson 2: Synchronized in the Surf Zone",
    text: "During SEAL training, the students are all broken down into boat crews—each crew is seven students: three on each side of a small rubber boat and one coxswain to help guide the dinghy. Every day your boat crew forms up on the beach and is instructed to get through the surf zone and paddle several miles down the coast. In the winter, the surf off San Diego can get to be eight to ten feet high, and it is exceedingly difficult to paddle through the plunging surf unless everyone digs in. Every paddle must be synchronized to the stroke count of the coxswain. Everyone must exert equal effort, or the boat will turn against the wave and be unceremoniously dumped back on the beach.",
    subtext: "十英尺巨浪里，只有全队每一桨节奏一致，才能冲破浪区抵达终点",
    sourceUrl: "https://www.youtube.com/watch?v=pxBQLFLei70"
  },
  {
    id: "yt:mcraven:full:06",
    badge: "YouTube 励志 · McRaven",
    title: "Lesson 3: The Munchkin Boat Crew",
    text: "Over a few weeks of difficult training, my SEAL class—which started with one hundred fifty men—was down to just forty-two. I was in the boat with the tall guys, but the best boat crew we had was made up of the little guys. The Munchkin crew we called them; no one was over five-foot-five. The Munchkin boat crew had one American Indian, one African American, one Polish American, one Greek American, one Italian American, and two tough kids from the Midwest. They out-paddled, outran, and out-swam all the other boat crews. The big men in the other crews would make good-natured fun of the tiny little flippers the Munchkins put on their feet, yet somehow these little guys from every corner of the world always had the last laugh, swimming faster and reaching the shore long before the rest of us.",
    subtext: "个头最小的队伍每次都最先登岸：海豹训练是公平的试金石，只看心有多大",
    sourceUrl: "https://www.youtube.com/watch?v=pxBQLFLei70"
  },
  {
    id: "yt:mcraven:full:07",
    badge: "YouTube 励志 · McRaven",
    title: "Lesson 4: Get Over Being a Sugar Cookie",
    text: "Several times a week, the instructors would line up the class and do a uniform inspection. Your hat had to be perfectly starched, your uniform immaculately pressed, your belt buckle shiny and void of any smudges. Yet no matter how much effort you put into it, the instructors would find something wrong. For failing inspection, you had to run fully clothed into the surf zone and roll around on the beach until every part of your body was covered with sand—known as a sugar cookie. Many students couldn't accept that all their efforts were in vain, and they didn't make it through training. They didn't understand the purpose of the drill: you were never going to have a perfect uniform. Sometimes, no matter how well you prepare or perform, you still end up as a sugar cookie. Get over it and keep moving forward.",
    subtext: "生活有时不讲道理，即便做到最好仍会变成“糖霜饼干”，别抱怨，继续前进",
    sourceUrl: "https://www.youtube.com/watch?v=pxBQLFLei70"
  },
  {
    id: "yt:mcraven:full:08",
    badge: "YouTube 励志 · McRaven",
    title: "Lesson 5: Don’t Be Afraid of the Circuses",
    text: "Every day during training you were challenged with multiple physical events—long runs, long swims, obstacle courses, hours of calisthenics. Every event had standards and times you had to meet. If you failed to meet those standards, your name was posted on a list, and at the end of the day those on the list were invited to a circus: two hours of additional calisthenics designed to wear you down and force you to quit. No one wanted a circus, because more fatigue meant the next day would be even harder. At some time during training, everyone made the circus list. Yet over time, those students who did two hours of extra calisthenics got stronger and stronger. The pain of the circuses built inner strength and physical resiliency. Life is filled with circuses; you will fail often, so don't be afraid of them.",
    subtext: "落后受罚的“马戏团加练”虽然煎熬，却会在日复一日中锻造出最强韧的内心",
    sourceUrl: "https://www.youtube.com/watch?v=pxBQLFLei70"
  },
  {
    id: "yt:mcraven:full:09",
    badge: "YouTube 励志 · McRaven",
    title: "Lesson 6: Slide Down Obstacles Head First",
    text: "At least twice a week, trainees were required to run the obstacle course—twenty-five obstacles including a ten-foot wall, a thirty-foot cargo net, and a barbed-wire crawl. The most challenging obstacle was the Slide for Life: a three-level thirty-foot tower at one end, a one-level tower at the other, and a two-hundred-foot-long rope in between. When my class began in 1977, the record had stood for years and seemed unbeatable—until one day a student decided to go down the Slide for Life head first. Instead of swinging underneath the rope and inching down, he bravely mounted the top and thrust himself forward. It was dangerous and fraught with risk, yet he slid down in half the time and broke the record. Sometimes you have to slide down the obstacles head first.",
    subtext: "打破多年纪录的秘诀，是敢于一改常规、头朝下冲过两百英尺长的绳索",
    sourceUrl: "https://www.youtube.com/watch?v=pxBQLFLei70"
  },
  {
    id: "yt:mcraven:full:10",
    badge: "YouTube 励志 · McRaven",
    title: "Lesson 7: Don’t Back Down from the Sharks",
    text: "During the land warfare phase of training, students are flown out to San Clemente Island off the coast of San Diego, whose waters are a breeding ground for great white sharks. Before the night swim, the instructors joyfully brief you on all the species of sharks that inhabit those waters, assuring you that no student has ever been eaten—at least not that they can remember. You are also taught that if a shark begins to circle your position, stand your ground. Do not swim away. Do not act afraid. And if the shark, hungry for a midnight snack, darts toward you, summon up all your strength and punch him in the snout, and he will turn and swim away. There are a lot of sharks in the world; don't back down from them.",
    subtext: "世上鲨鱼很多，遇到绕圈试探的危机，要站稳脚跟、毫不示弱，必要时迎头痛击",
    sourceUrl: "https://www.youtube.com/watch?v=pxBQLFLei70"
  },
  {
    id: "yt:mcraven:full:11",
    badge: "YouTube 励志 · McRaven",
    title: "Lesson 8: Your Best in the Darkest Moments",
    text: "One Navy SEAL mission is the ship attack, where a pair of divers is dropped off outside an enemy harbor and swims over two miles underwater using nothing but a depth gauge and a compass. During the swim, some ambient light comes through the surface. Yet as you approach the target ship tied to a pier, the steel structure blocks the moonlight and the surrounding streetlamps. To succeed, you have to swim under the ship and find the keel—the centerline and deepest part of the ship. The keel is also the darkest part, where you cannot see your hand in front of your face and the machinery noise is deafening. Under the keel, at that darkest moment, you must be calm, composed, and bring all your tactical skills and inner strength to bear.",
    subtext: "潜入敌舰龙骨之下最黑暗震耳的那一刻，恰恰是你必须展现最高水准的时刻",
    sourceUrl: "https://www.youtube.com/watch?v=pxBQLFLei70"
  },
  {
    id: "yt:mcraven:full:12",
    badge: "YouTube 励志 · McRaven",
    title: "Lesson 9: Start Singing in the Mud",
    text: "The ninth week of training is Hell Week—six days of no sleep, constant harassment, and fifteen hours in the freezing Tijuana mud flats. On Wednesday evening, my class was ordered into the mud until nothing was visible but our heads. The instructors told us we could leave the mud if only five men would quit. Over eight hours remained until dawn, and the chattering teeth and shivering moans were so loud it was hard to hear anything. Then one voice began to echo through the night, raised in song—terribly out of tune, but sung with great enthusiasm. One voice became two, two became three, and before long everyone was singing. The instructors threatened us with more time in the mud, yet the singing persisted—and somehow the mud seemed warmer and the dawn not so far away.",
    subtext: "地狱周冰冷泥潭里，一个人唱起走调却热烈的歌，希望让所有人撑到了天亮",
    sourceUrl: "https://www.youtube.com/watch?v=pxBQLFLei70"
  },
  {
    id: "yt:mcraven:full:13",
    badge: "YouTube 励志 · McRaven",
    title: "Lesson 10: Don’t Ever Ring the Bell",
    text: "Finally, in SEAL training there is a brass bell that hangs in the center of the compound for all the students to see. All you have to do to quit is ring the bell. Ring the bell and you no longer have to wake up at five o'clock, no longer have to be in the freezing cold swims, no longer have to do the runs, the obstacle course, the PT, and you no longer have to endure the hardships of training. All you have to do is ring the bell to get out. If you want to change the world, don't ever, ever ring the bell.",
    subtext: "营地中央挂着随时可以退出的铜铃，但想改变世界，就永远别去敲响它",
    sourceUrl: "https://www.youtube.com/watch?v=pxBQLFLei70"
  },
  {
    id: "yt:mcraven:full:14",
    badge: "YouTube 励志 · McRaven",
    title: "Closing Charge to the Class of 2014",
    text: "To the class of 2014, you are moments away from graduating and beginning your journey to change the world for the better. It will not be easy. Start each day with a task completed. Find someone to help you through life. Respect everyone. Know that life is not fair and that you will fail often. But if you take some risks, step up when the times are the toughest, face down the bullies, lift up the downtrodden, and never, ever give up—if you do these things, the next generation will live in a world far better than the one we have today, and what starts here will indeed have changed the world for the better.",
    subtext: "每天完成一件小事，在最艰难时挺身而出、扶助弱者、永不放弃",
    sourceUrl: "https://www.youtube.com/watch?v=pxBQLFLei70"
  },
  {
    id: "yt:brene:01",
    badge: "TED 演讲 · Brené Brown",
    title: "Researcher or Storyteller?",
    text: "A couple of years ago, an event planner called me because I was going to do a speaking event, and she said she was really struggling with how to write about me on the little flyer. She said, 'I'm going to call you a researcher, I think, but I'm afraid if I call you a researcher no one will come because they'll think you're boring and irrelevant. The thing I liked about your talk is you're a storyteller, so I think I'll just call you a storyteller.' The academic, insecure part of me thought, 'Wait—why not magic pixie?' Then I tried to call deep on my courage and realized: I am a qualitative researcher; I collect stories. Maybe stories are just data with a soul.",
    subtext: "定性研究者收集的正是人类的故事——也许故事就是“带着灵魂的数据” · TED",
    sourceUrl: "https://www.youtube.com/watch?v=iCvmsMzlF7o"
  },
  {
    id: "yt:brene:02",
    badge: "TED 演讲 · Brené Brown",
    title: "If You Cannot Measure It, It Does Not Exist",
    text: "When I was a young doctoral student in my first year, I had a research professor who said to us, 'Here's the thing: if you cannot measure it, it does not exist.' Having a bachelor's and master's in social work, my entire academic career was surrounded by people who believed in 'Life's messy—love it.' I'm more the 'Life's messy—clean it up, organize it, and put it into a bento box' type. One of the big sayings in social work is 'Lean into the discomfort of the work,' whereas my mantra was 'Knock discomfort upside the head and get all A's.' I wanted to understand messy topics, hack into them, and lay the code out for everyone to see.",
    subtext: "曾经习惯把混乱装进便当盒的学者，决定用研究解开人性中最复杂的情感密码",
    sourceUrl: "https://www.youtube.com/watch?v=iCvmsMzlF7o"
  },
  {
    id: "yt:brene:03",
    badge: "TED 演讲 · Brené Brown",
    title: "Connection Is Why We Are Here",
    text: "Where I started was with connection, because by the time you're a social worker for ten years, what you realize is that connection is why we're here. It's what gives purpose and meaning to our lives. Whether you talk to people who work in social justice, mental health, or abuse and neglect, what we know is that the ability to feel connected is neurobiologically how we're wired—it's why we're here. Yet just like getting a performance review with thirty-seven great points and one 'opportunity for growth,' whenever you ask people about love, they tell you about heartbreak; ask about belonging, they tell you about being excluded; and ask about connection, they tell you about disconnection.",
    subtext: "联结是人类神经系统的底层渴望，可人们谈起爱与联结时，往往先想起心碎与疏离",
    sourceUrl: "https://www.youtube.com/watch?v=iCvmsMzlF7o"
  },
  {
    id: "yt:brene:04",
    badge: "TED 演讲 · Brené Brown",
    title: "Shame Is the Fear of Disconnection",
    text: "About six weeks into this research, I ran into an unnamed thing that absolutely unraveled connection in a way I had never seen. I pulled back and realized it was shame. Shame is easily understood as the fear of disconnection: is there something about me that, if other people know it or see it, I won't be worthy of connection? It's universal—we all have it. The only people who don't experience shame have no capacity for human empathy or connection. No one wants to talk about it, and the less you talk about it, the more you have it. Underpinning this shame was the feeling of 'I'm not good enough'—and excruciating vulnerability.",
    subtext: "羞耻感的本质是害怕不被接纳；越是避而不谈，它对内心的控制力就越强",
    sourceUrl: "https://www.youtube.com/watch?v=iCvmsMzlF7o"
  },
  {
    id: "yt:brene:05",
    badge: "TED 演讲 · Brené Brown",
    title: "One Variable: Believing You Are Worthy",
    text: "My one year of research turned into six years—thousands of stories, hundreds of long interviews, focus groups, and journal pages. I thought I had a handle on shame and published a theory, yet something was still off. When I roughly divided the people I interviewed into those who really have a sense of worthiness—a strong sense of love and belonging—and folks who struggle for it and constantly wonder if they're good enough, there was only one variable separating them: the people who have a strong sense of love and belonging believe they are worthy of love and belonging. That's it. They believe they're worthy.",
    subtext: "六年上千份访谈揭示的唯一变量：拥有爱与归属感的人，打心底相信自己“值得”",
    sourceUrl: "https://www.youtube.com/watch?v=iCvmsMzlF7o"
  },
  {
    id: "yt:brene:06",
    badge: "TED 演讲 · Brené Brown",
    title: "Wholehearted Living & The Courage to Be Imperfect",
    text: "I took all the interviews where people lived from that deep sense of worthiness and labeled the folder 'Wholehearted.' What did they have in common? First, a sense of courage. The original definition of courage, from the Latin word cor meaning heart, was to tell the story of who you are with your whole heart. These folks had the courage to be imperfect. They had the compassion to be kind to themselves first and then to others—because you can't practice compassion with other people if you can't treat yourself kindly. And they had connection as a result of authenticity: they were willing to let go of who they thought they should be in order to be who they were.",
    subtext: "全心生活者的三大特质：敢于不完美、先善待自己再善待他人、放下“应该”做真实的自己",
    sourceUrl: "https://www.youtube.com/watch?v=iCvmsMzlF7o"
  },
  {
    id: "yt:brene:07",
    badge: "TED 演讲 · Brené Brown",
    title: "Vulnerability Is Necessary, Not Comfortable",
    text: "The other thing wholehearted people had in common was this: they fully embraced vulnerability. They believed that what made them vulnerable made them beautiful. They didn't talk about vulnerability being comfortable, nor did they talk about it being excruciating—they just talked about it being necessary. They talked about the willingness to say 'I love you' first, the willingness to do something where there are no guarantees, the willingness to breathe through waiting for the doctor to call after a mammogram, and the willingness to invest in a relationship that may or may not work out.",
    subtext: "接纳脆弱并不是因为舒服，而是因为它是建立真实关系与爱不可绕过的必经之路",
    sourceUrl: "https://www.youtube.com/watch?v=iCvmsMzlF7o"
  },
  {
    id: "yt:brene:08",
    badge: "TED 演讲 · Brené Brown",
    title: "When Research Triggers a Spiritual Awakening",
    text: "Personally, I thought this was a betrayal. I had pledged allegiance to research—whose explicit definition is to control and predict phenomena—and now my mission to control and predict had turned up the answer that the way to live is with vulnerability and to stop controlling and predicting! This led to what I call a breakdown, though my therapist Diana calls it a spiritual awakening. When I sat down in her office, I told her: 'I have a vulnerability issue. It's the core of shame and fear, yet it's also the birthplace of joy, creativity, belonging, and love. No family stuff, no childhood talk—I just need some strategies.'",
    subtext: "企图用研究控制一切的学者自己崩溃了——因为脆弱既是恐惧之源，也是喜悦与创造的诞生地",
    sourceUrl: "https://www.youtube.com/watch?v=iCvmsMzlF7o"
  },
  {
    id: "yt:brene:09",
    badge: "TED 演讲 · Brené Brown",
    title: "A Year-Long Street Fight with Vulnerability",
    text: "My therapist looked at me and said, 'It's neither good nor bad; it just is what it is.' And I said, 'Oh my God, this is going to suck.' It took about a year. You know how some people, when they realize vulnerability and tenderness are important, kind of surrender and walk right into it? That's not me, and I don't even hang out with people like that. For me it was a year-long street fight, a slugfest. Vulnerability pushed, I pushed back, and I lost the fight—but probably won my life back.",
    subtext: "与脆弱搏斗了一年，她虽然在控制欲上认输了，却赢回了自己真正的生活",
    sourceUrl: "https://www.youtube.com/watch?v=iCvmsMzlF7o"
  },
  {
    id: "yt:brene:10",
    badge: "TED 演讲 · Brené Brown",
    title: "You Cannot Selectively Numb Emotion",
    text: "We live in a vulnerable world—asking for help when you're newly married and sick, initiating intimacy, being turned down, waiting for the doctor to call, getting laid off, or laying people off. One of the ways we deal with it is to numb vulnerability. The problem is that you cannot selectively numb emotion. You cannot say, 'Here is the bad stuff—vulnerability, grief, shame, fear, disappointment—I don't want to feel these, so I'm going to have a couple of beers and a muffin.' When you numb those hard feelings, you also numb joy, gratitude, and happiness. Then we become miserable, look for purpose, feel vulnerable again, and fall into a dangerous cycle.",
    subtext: "情绪无法选择性关闭：逃避痛苦与脆弱的同时，你也会失去感知喜悦与感恩的能力",
    sourceUrl: "https://www.youtube.com/watch?v=iCvmsMzlF7o"
  },
  {
    id: "yt:brene:11",
    badge: "TED 演讲 · Brené Brown",
    title: "Certainty, Blame, and Trying to Perfect Our Kids",
    text: "It doesn't have to be addiction. We also numb by making everything uncertain certain: 'I'm right, you're wrong, shut up.' The more afraid we are, the more vulnerable we are; and in public discourse today there is no conversation, just blame—which research defines as a way to discharge pain and discomfort. We also try to perfect ourselves and, most dangerously, our children. When you hold those little babies in your hand, our job is not to keep them perfect and make sure they make the tennis team by fifth grade. Our job is to look and say: 'You're imperfect, and you're wired for struggle, but you are worthy of love and belonging.'",
    subtext: "别用非黑即白的武断、指责或强求完美来逃避焦虑；孩子需要的是无条件的接纳",
    sourceUrl: "https://www.youtube.com/watch?v=iCvmsMzlF7o"
  },
  {
    id: "yt:brene:12",
    badge: "TED 演讲 · Brené Brown",
    title: "Believe That We Are Enough",
    text: "There is another way, and I will leave you with this: to let ourselves be seen, deeply seen, vulnerably seen; to love with our whole hearts even though there is no guarantee, which is excruciatingly difficult; to practice gratitude and joy in those moments of terror when we wonder if we can love this much or believe this fiercely—instead of catastrophizing what might happen, to stop and say, 'I'm just so grateful, because to feel this vulnerable means I'm alive.' And most important, to believe that we're enough. When we work from a place that says 'I'm enough,' we stop screaming and start listening, and we're kinder and gentler to the people around us and to ourselves.",
    subtext: "感到脆弱恰恰说明你还鲜活地活着；相信“我已经足够好”，内心就会安静而温柔",
    sourceUrl: "https://www.youtube.com/watch?v=iCvmsMzlF7o"
  },
  {
    id: "yt:sinek:01",
    badge: "TED 演讲 · Simon Sinek",
    title: "Defying the Assumptions",
    text: "How do you explain when things don't go as we assume? Or better, how do you explain when others achieve things that seem to defy all assumptions? Why is Apple so innovative year after year, even though they're just a computer company with the same access to talent, agencies, and media? Why did Martin Luther King lead the civil rights movement when he wasn't the only man who suffered or the only great orator? And why did the Wright brothers achieve controlled, powered, manned flight when better-qualified, better-funded teams failed? All great inspiring leaders and organizations think, act, and communicate the exact same way—the complete opposite of everyone else. I call it the Golden Circle: Why, How, What.",
    subtext: "苹果、马丁·路德·金与莱特兄弟看似迥异，却共享同一种由内而外的“黄金圈”思维 · TED",
    sourceUrl: "https://www.youtube.com/watch?v=qp0HIF3SfI4"
  },
  {
    id: "yt:sinek:02",
    badge: "TED 演讲 · Simon Sinek",
    title: "What, How, and the Rare Why",
    text: "Every single person and every single organization on the planet knows what they do—one hundred percent. Some know how they do it, whether you call it your differentiating value proposition, proprietary process, or unique selling point. Yet very, very few people or organizations know why they do what they do. And by 'why,' I don't mean to make a profit—that's always a result. By 'why,' I mean: what's your purpose, what's your cause, what's your belief? Why does your organization exist? Why do you get out of bed in the morning, and why should anyone care?",
    subtext: "人人都知道自己在做什么（What），却极少有人真正想清自己为什么而做（Why）",
    sourceUrl: "https://www.youtube.com/watch?v=qp0HIF3SfI4"
  },
  {
    id: "yt:sinek:03",
    badge: "TED 演讲 · Simon Sinek",
    title: "Outside-In vs. Inside-Out Communication",
    text: "Most of us think, act, and communicate from the outside in, going from the clearest thing to the fuzziest thing. If Apple were like everyone else, a marketing message might sound like: 'We make great computers. They're beautifully designed, simple to use, and user-friendly. Want to buy one?' That's uninspiring. Here is how Apple actually communicates, from the inside out: 'Everything we do, we believe in challenging the status quo; we believe in thinking differently. The way we challenge the status quo is by making our products beautifully designed, simple to use, and user-friendly. We just happen to make great computers. Want to buy one?' All I did was reverse the order—and it proves that people don't buy what you do; people buy why you do it.",
    subtext: "仅仅把说话顺序从“What→Why”反过来，就能解释为什么人们愿意为理念买单",
    sourceUrl: "https://www.youtube.com/watch?v=qp0HIF3SfI4"
  },
  {
    id: "yt:sinek:04",
    badge: "TED 演讲 · Simon Sinek",
    title: "Why Gateway and Dell Struggled Outside Computers",
    text: "Because people don't buy what you do, they buy why you do it, everyone in this room is perfectly comfortable buying a computer, an MP3 player, a phone, or a DVR from Apple—even though Apple is structurally just a computer company. When Gateway came out with flat-screen TVs after making flat-screen monitors for years, nobody bought one. When Dell came out with MP3 players and PDAs of great quality, nobody bought one either. Why would you buy an MP3 player from a computer company? Yet we do it every day from Apple. The goal is not to do business with everybody who needs what you have; the goal is to do business with people who believe what you believe.",
    subtext: "真正的客户与伙伴不是“需要你产品的人”，而是“相信你所相信之事的人”",
    sourceUrl: "https://www.youtube.com/watch?v=qp0HIF3SfI4"
  },
  {
    id: "yt:sinek:05",
    badge: "TED 演讲 · Simon Sinek",
    title: "The Biology of the Limbic Brain",
    text: "None of what I'm telling you is my opinion; it is grounded in the tenets of biology. Looking at a cross-section of the human brain from the top down, our newest brain—the neocortex—corresponds with the What level, responsible for rational and analytical thought and language. The middle two sections make up our limbic brain, responsible for all our feelings like trust and loyalty, as well as all human behavior and decision making—yet it has no capacity for language. When we communicate from the outside in, people understand vast facts and figures, yet it doesn't drive behavior. When we communicate from the inside out, we talk directly to the part of the brain that controls behavior—that's where 'it just doesn't feel right' gut decisions come from.",
    subtext: "决定人类行动的边缘系统并不掌控语言，所以纯靠罗列事实往往无法打动人心",
    sourceUrl: "https://www.youtube.com/watch?v=qp0HIF3SfI4"
  },
  {
    id: "yt:sinek:06",
    badge: "TED 演讲 · Simon Sinek",
    title: "Blood, Sweat, and Tears vs. Working for Money",
    text: "The goal is not just to sell to people who need what you have; the goal is to sell to people who believe what you believe. And the goal is not just to hire people who need a job; it's to hire people who believe what you believe. If you hire people just because they can do a job, they will work for your money. But if you hire people who believe what you believe, they will work for you with blood, sweat, and tears.",
    subtext: "只为薪水工作的人付出的是工时，与你信念同频的人才会倾注心血",
    sourceUrl: "https://www.youtube.com/watch?v=qp0HIF3SfI4"
  },
  {
    id: "yt:sinek:07",
    badge: "TED 演讲 · Simon Sinek",
    title: "Samuel Langley vs. The Wright Brothers",
    text: "Nowhere is this clearer than with the Wright brothers. In the early twentieth century, powered flight was the dot-com of the day. Samuel Pierpont Langley had what we assume to be the recipe for success: fifty thousand dollars from the War Department, a seat at Harvard, connections at the Smithsonian, the best minds money could find, and the New York Times following him everywhere. Yet we have never heard of him. A few hundred miles away in Dayton, Ohio, Orville and Wilbur Wright had no money—they funded their dream with proceeds from their bicycle shop—and not a single person on their team had a college education. Every time they went out, they took five sets of parts because that's how many times they crashed before supper. On December 17, 1903, they took flight—and Langley quit that very day, because he wasn't first, didn't get rich, and didn't get famous.",
    subtext: "资金、人脉、名校光环全在兰利一边，但最终飞上蓝天的是怀揣信念、摔五次照样修飞机的莱特兄弟",
    sourceUrl: "https://www.youtube.com/watch?v=qp0HIF3SfI4"
  },
  {
    id: "yt:sinek:08",
    badge: "TED 演讲 · Simon Sinek",
    title: "Crossing the Chasm at 15–18 Percent",
    text: "According to the Law of Diffusion of Innovation, the first two and a half percent of our population are innovators, the next thirteen and a half percent are early adopters, the next thirty-four percent are the early majority, followed by the late majority and laggards. You cannot achieve mass-market acceptance of an idea until you reach the tipping point between fifteen and eighteen percent market penetration. The early majority will not try something until someone else has tried it first—like the early adopters who stood in line for six hours for the first iPhone because they wanted to prove to the world what they believed.",
    subtext: "15%–18% 的渗透率是引爆大众市场的临界点，前提是先找到那群相信你理念的早期支持者",
    sourceUrl: "https://www.youtube.com/watch?v=qp0HIF3SfI4"
  },
  {
    id: "yt:sinek:09",
    badge: "TED 演讲 · Simon Sinek",
    title: "Why TiVo Failed Despite Great Tech",
    text: "Look at TiVo: when it launched, it was the highest quality product on the market, extremely well funded, and in great market conditions—yet it was a commercial failure because they told us what they had: 'We have a product that pauses live TV, skips commercials, and memorizes your viewing habits.' The cynical majority said, 'We don't believe you, and you're scaring us.' What if they had said, 'If you're the kind of person who likes total control over every aspect of your life, boy do we have a product for you'? What you do simply serves as the proof of what you believe.",
    subtext: "产品功能本身只是信念的证明；只推销功能而不讲信念，往往让人感到疏离",
    sourceUrl: "https://www.youtube.com/watch?v=qp0HIF3SfI4"
  },
  {
    id: "yt:sinek:10",
    badge: "TED 演讲 · Simon Sinek",
    title: "250,000 People Showed Up for Themselves",
    text: "In the summer of 1963, two hundred fifty thousand people showed up on the Mall in Washington to hear Dr. King speak, even though no invitations were sent out and there was no website to check the date. He didn't go around telling people what needed to change; he told people what he believed: 'I believe, I believe, I believe.' People who believed what he believed took his cause and made it their own. How many of them showed up for him? Zero. They showed up for themselves and what they believed about America. And by the way, he gave the 'I Have a Dream' speech—not the 'I Have a Plan' speech.",
    subtext: "二十五万人冒着酷暑赶赴华盛顿，不是为了某个人，而是为了自己心中的信念",
    sourceUrl: "https://www.youtube.com/watch?v=qp0HIF3SfI4"
  },
  {
    id: "yt:sinek:11",
    badge: "TED 演讲 · Simon Sinek",
    title: "Leaders vs. Those Who Lead",
    text: "Listen to politicians today with comprehensive twelve-point plans who aren't inspiring anybody. There are leaders, and there are those who lead. Leaders hold a position of power or authority, but those who lead inspire us. Whether they are individuals or organizations, we follow those who lead not because we have to, but because we want to. We follow those who lead not for them, but for ourselves. And it's those who start with Why that have the ability to inspire those around them or find others who inspire them.",
    subtext: "真正的引领者从“Why”出发，让人不是出于被迫，而是发自内心想要追随",
    sourceUrl: "https://www.youtube.com/watch?v=qp0HIF3SfI4"
  },
  {
    id: "yt:grant:01",
    badge: "TED 演讲 · Adam Grant",
    title: "Passing on a Billion-Dollar Glasses Startup",
    text: "Seven years ago, a student came to me and asked me to invest in his company. He said, 'I'm working with three friends to disrupt an industry by selling stuff online.' Six months went by, and the day before the company launched there was still no functioning website, and all four founders had lined up backup jobs. I declined to invest. They named the company Warby Parker, became valued at over a billion dollars—and now my wife handles our investments. To find out why I was so wrong, I began studying Originals: non-conformists who not only have new ideas, but take action to champion them.",
    subtext: "错过十亿美元项目后，组织心理学家亚当·格兰特开始研究“原创者”的反直觉习惯 · TED",
    sourceUrl: "https://www.youtube.com/watch?v=fxbCHn6gE3U"
  },
  {
    id: "yt:grant:02",
    badge: "TED 演讲 · Adam Grant",
    title: "Confessions of a Precrastinator",
    text: "The first reason I passed on Warby Parker was that they were slow getting off the ground. Now, you are intimately familiar with the mind of a procrastinator; I have a confession—I'm the opposite, a precrastinator. You know that panic you feel a few hours before a big deadline when you haven't started? I feel that a few months ahead of time. I finished my senior thesis four months before the deadline, and I was proud of that until a student named Jihae told me, 'I have my most creative ideas when I'm procrastinating.' So I challenged her to gather data from real companies.",
    subtext: "习惯提前四个月交论文的“反拖延症患者”，被学生一句话激起了实验灵感",
    sourceUrl: "https://www.youtube.com/watch?v=fxbCHn6gE3U"
  },
  {
    id: "yt:grant:03",
    badge: "TED 演讲 · Adam Grant",
    title: "The 16% Creativity Boost from Moderate Procrastination",
    text: "Our studies showed that precrastinators who rush in are in such a frenzy of anxiety that they don't have original thoughts, while people who wait until the last minute are too busy scrambling to generate new ideas. There is a sweet spot where Originals live. In experiments where we dangled Minesweeper in front of participants for five or ten minutes after telling them the task, moderate procrastinators were sixteen percent more creative than the other two groups. When the task stays active in the back of your mind, procrastination gives you time to incubate divergent ideas, think in nonlinear ways, and make unexpected leaps.",
    subtext: "知道任务后适度搁置，能让大脑在后台酝酿出多 16% 的非线性创意火花",
    sourceUrl: "https://www.youtube.com/watch?v=fxbCHn6gE3U"
  },
  {
    id: "yt:grant:04",
    badge: "TED 演讲 · Adam Grant",
    title: "Da Vinci & MLK: Quick to Start, Slow to Finish",
    text: "While writing a book on Originals, I put my own procrastination chapter away mid-sentence for months. It was agony, yet when I returned, I had all sorts of new ideas—as Aaron Sorkin put it, 'You call it procrastinating; I call it thinking.' Leonardo da Vinci toiled on and off for sixteen years on the Mona Lisa, and his diversions into optics transformed how he modeled light. The night before the March on Washington, Martin Luther King Jr. was up past three a.m. rewriting his speech, and eleven minutes into his delivery he left his prepared remarks to utter four unscripted words: 'I have a dream.' Great originals are quick to start, but slow to finish.",
    subtext: "不把初稿早早写死，才让马丁·路德·金在演讲第 11 分钟即兴喊出“我有一个梦想”",
    sourceUrl: "https://www.youtube.com/watch?v=fxbCHn6gE3U"
  },
  {
    id: "yt:grant:05",
    badge: "TED 演讲 · Adam Grant",
    title: "First-Mover Advantage Is Mostly a Myth",
    text: "When Warby Parker dragged their heels for six months, I thought they'd missed the first-mover advantage. What I didn't realize was that they were spending that time figuring out how to make people comfortable ordering glasses online. A classic study of over fifty product categories found that first movers had a failure rate of forty-seven percent, compared with only eight percent for improvers. Think of Facebook after Myspace and Friendster, or Google after AltaVista and Yahoo. To be original, you don't have to be first; you just have to be different and better.",
    subtext: "与其急着抢占“第一个”，不如花时间把体验打磨到“与众不同且更好”",
    sourceUrl: "https://www.youtube.com/watch?v=fxbCHn6gE3U"
  },
  {
    id: "yt:grant:06",
    badge: "TED 演讲 · Adam Grant",
    title: "Self-Doubt Freezes, Idea Doubt Energizes",
    text: "The second reason I passed on Warby Parker was that they had backup plans, which made me doubt their courage. On the surface, originals look fearless, yet behind the scenes they feel the same fear and doubt we do. In my research, I found two distinct kinds of doubt: self-doubt and idea doubt. Self-doubt is paralyzing; it leads you to freeze. Idea doubt is energizing; it motivates you to test, experiment, and refine, just like Dr. King did. Instead of saying 'I'm terrible,' you say, 'The first few drafts are always rough, and I'm just not there yet.'",
    subtext: "怀疑自己会让人瘫痪，但怀疑点子本身会推动你不断测试、实验和完善",
    sourceUrl: "https://www.youtube.com/watch?v=fxbCHn6gE3U"
  },
  {
    id: "yt:grant:07",
    badge: "TED 演讲 · Adam Grant",
    title: "Doubt the Default & Experience Vuja De",
    text: "There is good evidence that Firefox and Chrome users significantly outperform Internet Explorer and Safari users and stay in their jobs fifteen percent longer—not for any technical reason, since typing speed and computer knowledge are equal, but because they doubted the pre-installed default option and took the initiative to look for something better. When you doubt the default, you open yourself up to 'vuja de'—the opposite of deja vu, looking at something you've seen many times before and seeing it with fresh eyes, just like screenwriter Jennifer Lee reinvented Frozen's villain as a tortured hero.",
    subtext: "不满足于“出厂默认选项”的人，更容易用全新眼光重新审视习以为常的事物",
    sourceUrl: "https://www.youtube.com/watch?v=fxbCHn6gE3U"
  },
  {
    id: "yt:grant:08",
    badge: "TED 演讲 · Adam Grant",
    title: "Afraid of Failing to Try",
    text: "Originals feel fear too; they're afraid of failing. What sets them apart is that they're even more afraid of failing to try. They know that in the long run, our biggest regrets are not our actions, but our inactions—the chances not taken. Elon Musk told me he didn't expect Tesla to succeed and was sure the first few SpaceX launches would fail to reach orbit, yet it was too important not to try. Across industries, eighty-five percent of people stay silent about their biggest idea out of fear of looking stupid—even though you won't be judged on your bad ideas.",
    subtext: "真正令人遗憾的往往不是失败，而是因为害怕出丑而连试都不敢试",
    sourceUrl: "https://www.youtube.com/watch?v=fxbCHn6gE3U"
  },
  {
    id: "yt:grant:09",
    badge: "TED 演讲 · Adam Grant",
    title: "Volume Breeds Originality: Bach, Mozart & Edison",
    text: "You celebrate Thomas Edison for pioneering the light bulb, not for inventing a creepy talking doll. Across fields, the greatest originals are the ones who fail the most, because they are the ones who try the most. For classical composers, one of the strongest predictors of lasting greatness is the sheer volume of compositions they generate: Bach, Beethoven, and Mozart had to write hundreds of pieces to produce a smaller number of masterpieces. And the Warby Parker founders tested over two thousand name possibilities before putting together Warby and Parker. Originals aren't superhuman; they just keep generating until gold appears.",
    subtext: "巴赫、贝多芬和莫扎特都靠海量产出才筛出传世杰作，高产与试错是原创的底座",
    sourceUrl: "https://www.youtube.com/watch?v=fxbCHn6gE3U"
  },
  {
    id: "yt:rowling:full:01",
    badge: "哈佛演讲 · J.K. Rowling",
    title: "Twenty-One Years Since Graduation",
    text: "Delivering a commencement address is a great responsibility—or so I thought, until I cast my mind back to my own graduation. The speaker that day was the distinguished British philosopher Baroness Mary Warnock, and it turns out I can't remember a single word she said. That liberating discovery enabled me to ask myself what I wish I had known at twenty-one, and what important lessons I have learned in the twenty-one years since. I came up with two answers: the benefits of failure, and the crucial importance of imagination.",
    subtext: "罗琳回望毕业 21 年历程，送给哈佛毕业生两个核心词：失败的益处与想象力 · Harvard 2008",
    sourceUrl: "https://www.youtube.com/watch?v=EKYX3bh3aV8"
  },
  {
    id: "yt:rowling:full:02",
    badge: "哈佛演讲 · J.K. Rowling",
    title: "Ditching German for the Classics Corridor",
    text: "Half my lifetime ago, I was striking an uneasy balance between my ambition to write novels and what those closest to me expected. My parents, who came from impoverished backgrounds and had never been to college, hoped I would take a vocational degree. We compromised on modern languages, yet hardly had my parents' car rounded the corner at the end of the road than I ditched German and scuttled off down the classics corridor. Still, there is an expiry date on blaming your parents for steering you in the wrong direction; the moment you are old enough to take the wheel, responsibility lies with you.",
    subtext: "责怪父母是有截止日期的；一旦自己握紧人生方向盘，就要为选择负全责",
    sourceUrl: "https://www.youtube.com/watch?v=EKYX3bh3aV8"
  },
  {
    id: "yt:rowling:full:03",
    badge: "哈佛演讲 · J.K. Rowling",
    title: "What Poverty Really Feels Like",
    text: "I cannot criticize my parents for hoping I would never experience poverty. They had been poor themselves, and I have since been poor, and I agree with them that it is not an ennobling experience. Poverty entails fear, stress, and sometimes depression; it means a thousand petty humiliations and hardships. Climbing out of poverty by your own efforts is something on which to pride yourself, yet poverty itself is romanticized only by fools. What I feared most for myself at your age was not poverty, however, but failure.",
    subtext: "只有蠢人才会浪漫化贫穷；值得骄傲的是靠自己双手走出泥潭的过程",
    sourceUrl: "https://www.youtube.com/watch?v=EKYX3bh3aV8"
  },
  {
    id: "yt:rowling:full:04",
    badge: "哈佛演讲 · J.K. Rowling",
    title: "Rock Bottom Became My Solid Foundation",
    text: "A mere seven years after graduation, by any conventional measure, I had failed on an epic scale. An exceptionally short-lived marriage had imploded, and I was jobless, a lone parent, and as poor as it is possible to be in modern Britain without being homeless. Why talk about the benefits of failure? Simply because failure meant a stripping away of the inessential. I stopped pretending to myself that I was anything other than what I was, and began to direct all my energy into finishing the only work that mattered to me. I was set free, because my greatest fear had been realized, and I was still alive, with a daughter whom I adored, an old typewriter, and a big idea. Rock bottom became the solid foundation on which I rebuilt my life.",
    subtext: "失败剥去一切虚饰，当最坏的情况发生而你依然活着，谷底就成了重建人生的基石",
    sourceUrl: "https://www.youtube.com/watch?v=EKYX3bh3aV8"
  },
  {
    id: "yt:rowling:full:05",
    badge: "哈佛演讲 · J.K. Rowling",
    title: "Life Is Not a Checklist of Acquisitions",
    text: "Some failure in life is inevitable. It is impossible to live without failing at something, unless you live so cautiously that you might as well not have lived at all—in which case, you fail by default. Failure gave me an inner security that I had never attained by passing examinations, and I found friends whose value was truly above the price of rubies. Personal happiness lies in knowing that life is not a checklist of acquisition or achievement. Your qualifications, your CV, are not your life. Life is difficult and complicated, and the humility to know that will enable you to survive its vicissitudes.",
    subtext: "过得太小心翼翼本身就是默认失败；履历表不是你的全部人生",
    sourceUrl: "https://www.youtube.com/watch?v=EKYX3bh3aV8"
  },
  {
    id: "yt:rowling:full:06",
    badge: "哈佛演讲 · J.K. Rowling",
    title: "Imagination: The Power to Empathize",
    text: "I have learned to value imagination in a much broader sense. Imagination is not only the unique human capacity to envision that which is not, and therefore the fount of all invention and innovation. In its arguably most transformative and revelatory capacity, it is the power that enables us to empathize with humans whose experiences we have never shared. One of the greatest formative experiences of my life preceded Harry Potter: working at the African research department of Amnesty International in London, reading smuggled letters and eyewitness accounts of torture victims and political prisoners.",
    subtext: "想象力不仅催生发明创造，更是让我们对他人的苦难感同身受的能力",
    sourceUrl: "https://www.youtube.com/watch?v=EKYX3bh3aV8"
  },
  {
    id: "yt:rowling:full:07",
    badge: "哈佛演讲 · J.K. Rowling",
    title: "Apathy Colludes with Real Monsters",
    text: "Unlike any other creature on this planet, human beings can learn and understand without having experienced; we can think ourselves into other people's places. Yet many prefer not to exercise their imaginations at all. They choose to remain comfortably within the bounds of their own experience and refuse to know. Those who choose not to empathize enable real monsters, for without ever committing an act of outright evil ourselves, we collude with it through our own apathy. As Plutarch wrote, 'What we achieve inwardly will change outer reality.'",
    subtext: "拒绝去共情就是用冷漠纵容恶；人在内心修得的慈悲终将改变外部现实",
    sourceUrl: "https://www.youtube.com/watch?v=EKYX3bh3aV8"
  },
  {
    id: "yt:rowling:full:08",
    badge: "哈佛演讲 · J.K. Rowling",
    title: "No Magic Needed & Seneca’s Wisdom",
    text: "If you choose to use your status and influence to raise your voice on behalf of those who have no voice, and retain the ability to imagine yourself into the lives of those who do not have your advantages, then thousands and millions of people will celebrate your existence. We do not need magic to transform our world; we carry all the power we need inside ourselves already—we have the power to imagine better. Tomorrow, remember the words of Seneca: 'As is a tale, so is life: not how long it is, but how good it is, is what matters.' I wish you all very good lives.",
    subtext: "改变世界的魔法就在你自己手里；人生如故事，不在于长短，而在于是否精彩",
    sourceUrl: "https://www.youtube.com/watch?v=EKYX3bh3aV8"
  },
  {
    id: "yt:jobs:full:01",
    badge: "斯坦福演讲 · Steve Jobs",
    title: "Story 1: Adopted & Dropping Out of Reed",
    text: "I never graduated from college, and this is the closest I've ever gotten to a college graduation. Today I want to tell you three stories from my life. The first story is about connecting the dots. Before I was born, my biological mother put me up for adoption, insisting I be raised by college graduates. When my adoptive parents—neither of whom had graduated from college—promised I would go to college, she signed the papers. Seventeen years later, I naively chose a college almost as expensive as Stanford, and all of my working-class parents' savings were being spent on my tuition. After six months I couldn't see the value in it, so I decided to drop out and trust it would all work out.",
    subtext: "不忍耗尽养父母一辈子积蓄而选择退学，这是乔布斯“串联人生点滴”的起点 · Stanford 2005",
    sourceUrl: "https://www.youtube.com/watch?v=4wwUUoLjcdw"
  },
  {
    id: "yt:jobs:full:02",
    badge: "斯坦福演讲 · Steve Jobs",
    title: "Sleeping on Floors & Taking Calligraphy",
    text: "It wasn't all romantic. I didn't have a dorm room, so I slept on the floor in friends' rooms, returned Coke bottles for the five-cent deposits to buy food, and walked seven miles across town every Sunday night for one good meal at the Hare Krishna temple. Much of what I stumbled into by following my curiosity and intuition turned out to be priceless later on. Because I had dropped out, I took a calligraphy class—learning about serif and sans-serif typefaces and what makes great typography great. Ten years later, when we were designing the first Macintosh, it all came back to me. You can't connect the dots looking forward; you can only connect them looking backwards.",
    subtext: "睡地板捡瓶子旁听的书法课，十年后化作第一代 Mac 的灵魂排版",
    sourceUrl: "https://www.youtube.com/watch?v=4wwUUoLjcdw"
  },
  {
    id: "yt:jobs:full:03",
    badge: "斯坦福演讲 · Steve Jobs",
    title: "Story 2: Fired from Apple at Thirty",
    text: "My second story is about love and loss. Woz and I started Apple in my parents' garage when I was twenty, and in ten years it grew into a two-billion-dollar company with over four thousand employees. Then our visions of the future began to diverge, the board sided against me, and at thirty I was out—and very publicly out. What had been the focus of my entire adult life was gone, and it was devastating. Yet something slowly began to dawn on me: I still loved what I did. I'd been rejected, but I was still in love. And so I decided to start over.",
    subtext: "三十岁被自己亲手创办的公司扫地出门，但对所爱之事的热情让他决定重头再来",
    sourceUrl: "https://www.youtube.com/watch?v=4wwUUoLjcdw"
  },
  {
    id: "yt:jobs:full:04",
    badge: "斯坦福演讲 · Steve Jobs",
    title: "The Lightness of Being a Beginner Again",
    text: "I didn't see it then, but getting fired from Apple was the best thing that could have ever happened to me. The heaviness of being successful was replaced by the lightness of being a beginner again, less sure about everything. It freed me to enter one of the most creative periods of my life: starting NeXT, starting Pixar—which created Toy Story, the world's first computer-animated feature film—and falling in love with my wife Laurene. In a remarkable turn of events, Apple bought NeXT and I returned to Apple. None of this would have happened if I hadn't been fired. It was awful-tasting medicine, yet the patient needed it.",
    subtext: "这剂苦药治好了成功的包袱，让乔布斯在 NeXT 与皮克斯开启最富创造力的五年",
    sourceUrl: "https://www.youtube.com/watch?v=4wwUUoLjcdw"
  },
  {
    id: "yt:jobs:full:05",
    badge: "斯坦福演讲 · Steve Jobs",
    title: "Story 3: If Today Were the Last Day",
    text: "My third story is about death. When I was seventeen, I read a quote: 'If you live each day as if it was your last, someday you'll most certainly be right.' For the past thirty-three years, I have looked in the mirror every morning and asked myself: 'If today were the last day of my life, would I want to do what I am about to do today?' Whenever the answer has been 'No' for too many days in a row, I know I need to change something. Remembering that I'll be dead soon is the most important tool I've ever encountered to help me make the big choices in life.",
    subtext: "连续 33 年清晨对镜自问：如果今天是最后一天，我还要继续手头的事吗？",
    sourceUrl: "https://www.youtube.com/watch?v=4wwUUoLjcdw"
  },
  {
    id: "yt:jobs:full:06",
    badge: "斯坦福演讲 · Steve Jobs",
    title: "Facing Cancer & Death as Life’s Change Agent",
    text: "About a year ago I was diagnosed with pancreatic cancer and told to expect to live three to six months—to go home and get my affairs in order. Later that evening, a biopsy showed it was a very rare form curable with surgery, and thankfully I'm fine now. Having lived through it, I can say with certainty: no one wants to die, yet death is the destination we all share. Death is very likely the single best invention of life; it is life's change agent, clearing out the old to make way for the new. Your time is limited, so don't waste it living someone else's life. Have the courage to follow your heart and intuition.",
    subtext: "向死而生教会人剥离外部期待，把有限的时间留给自己真正想成为的样子",
    sourceUrl: "https://www.youtube.com/watch?v=4wwUUoLjcdw"
  },
  {
    id: "yt:mccullough:01",
    badge: "毕业演讲 · David McCullough Jr.",
    title: "None of You Is Special",
    text: "Here we are at commencement—on a literal level playing field. Look at your ceremonial costume: a shapeless, one-size-fits-all uniform, whether scholar or slacker, prom queen or Xbox assassin, each of you dressed exactly the same. And your diploma, but for your name, is exactly the same. All of this is as it should be, because none of you is special. You're not special. You're not exceptional, contrary to what your under-nine soccer trophy suggests, your glowing seventh-grade report card, or every assurance from Mr. Rogers.",
    subtext: "同样的学位服与毕业证书提醒每个人：你们并不是宇宙中心里独受优待的“特殊孩子” · 2012",
    sourceUrl: "https://www.youtube.com/watch?v=_lfxYhtf8o4"
  },
  {
    id: "yt:mccullough:02",
    badge: "毕业演讲 · David McCullough Jr.",
    title: "Seven Thousand Just Like You",
    text: "Across the country, no fewer than 3.2 million seniors are graduating from more than thirty-seven thousand high schools. That's thirty-seven thousand valedictorians and thirty-seven thousand class presidents. Even if you're one in a million, on a planet of nearly seven billion people that means there are nearly seven thousand people just like you. Your planet is not the center of its solar system, your solar system is not the center of its galaxy, and astrophysicists assure us the universe has no center—therefore, you cannot be it.",
    subtext: "全美三万七千名第一名；哪怕你是万里挑一，全球也有七千个跟你一模一样的人",
    sourceUrl: "https://www.youtube.com/watch?v=_lfxYhtf8o4"
  },
  {
    id: "yt:mccullough:03",
    badge: "毕业演讲 · David McCullough Jr.",
    title: "Accolades vs. Genuine Achievement",
    text: "If everyone is special, then no one is. If everyone gets a trophy, trophies become meaningless. We have come to love accolades more than genuine achievement, happy to compromise standards if we suspect that's the quickest way to put something on the mantelpiece. No longer is it how you play the game, or whether you win or lose or learn or grow; now it's 'So what does this get me?' As a consequence, we cheapen worthy endeavors—and building a medical clinic becomes more about a college application than the well-being of the people.",
    subtext: "别把公益与努力变成只为履历加分的功利筹码，那样会贬低真正有价值的追求",
    sourceUrl: "https://www.youtube.com/watch?v=_lfxYhtf8o4"
  },
  {
    id: "yt:mccullough:04",
    badge: "毕业演讲 · David McCullough Jr.",
    title: "Love What You Do & Read All the Time",
    text: "I hope you've learned enough to recognize how little you know now, for today is just the beginning. It's where you go from here that matters. I urge you to do whatever you do for no reason other than you love it and believe in its importance. Resist the easy comforts of complacency, the specious glitter of materialism, the narcotic paralysis of self-satisfaction. Read—read all the time, read as a matter of principle, as a matter of self-respect, read as a nourishing staple of life. Develop and protect a moral sensibility, dream big, work hard, think for yourself, and love with all your might.",
    subtext: "抵制物质虚荣与安逸自满，把持续阅读当成自尊与生命养分，全力去爱与思考",
    sourceUrl: "https://www.youtube.com/watch?v=_lfxYhtf8o4"
  },
  {
    id: "yt:mccullough:05",
    badge: "毕业演讲 · David McCullough Jr.",
    title: "Climb the Mountain to See the World",
    text: "The fulfilling life, the distinctive life, the relevant life is an achievement, not something that will fall into your lap. The Founding Fathers secured your right to the 'pursuit' of happiness—quite an active verb. Don't wait for inspiration or passion to find you; get up, get out, explore, find it yourself, and grab hold with both hands. Climb the mountain not to plant your flag, but to embrace the challenge, enjoy the air, and behold the view. Climb it so you can see the world, not so the world can see you.",
    subtext: "登山不是为了插旗让世界看见你，而是为了迎风登顶、看见更广阔的世界",
    sourceUrl: "https://www.youtube.com/watch?v=_lfxYhtf8o4"
  },
  {
    id: "yt:mccullough:06",
    badge: "毕业演讲 · David McCullough Jr.",
    title: "Selflessness Is the Best Thing for Yourself",
    text: "Go to Paris to be in Paris, not to cross it off your list and congratulate yourself for being worldly. Exercise free will and creative independent thought not for the satisfactions they will bring you, but for the good they will do others—the rest of the planet and those who will follow them. Then you too will discover the great and curious truth of the human experience: that selflessness is the best thing you can do for yourself. The sweetest joys of life come only with the recognition that you're not special—because everyone is.",
    subtext: "去巴黎是为了感受巴黎本身，而非打卡炫耀；无私利他终究是对自己最好的成全",
    sourceUrl: "https://www.youtube.com/watch?v=_lfxYhtf8o4"
  }
,
  {
    id: "yt:duckworth:01",
    badge: "TED 演讲 · Angela Duckworth",
    title: "Leaving Consulting to Teach Seventh-Grade Math",
    text: "When I was twenty-seven years old, I left a very demanding job in management consulting for a job that was even more demanding: teaching. I went to teach seventh-graders math in the New York City public schools, and like any teacher I made quizzes and tests, gave out homework assignments, and calculated grades. What struck me was that IQ was not the only difference between my best and my worst students. Some of my strongest performers did not have stratospheric IQ scores, and some of my smartest kids weren't doing so well. The concepts—ratios, decimals, the area of a parallelogram—are hard, yet not impossible, and I was firmly convinced that every student could learn if they worked hard and long enough.",
    subtext: "27 岁离开管理咨询去教初中数学后，她发现决定成绩差距的往往不是智商 · TED",
    sourceUrl: "https://www.youtube.com/watch?v=H14bBuluwB8"
  },
  {
    id: "yt:duckworth:02",
    badge: "TED 演讲 · Angela Duckworth",
    title: "West Point, Spelling Bees & Tough Neighborhoods",
    text: "After several years of teaching, I concluded that what we need in education is a much better understanding of students from a motivational, psychological perspective. So I left the classroom and went to graduate school to become a psychologist. My research team and I went to West Point Military Academy to predict which cadets would stay in military training and which would drop out; we went to the National Spelling Bee to predict which children would advance farthest; we studied rookie teachers working in tough neighborhoods, and partnered with private companies to see which salespeople would keep their jobs and earn the most.",
    subtext: "从西点军校到全国拼字大赛，心理学团队在各种高压场景寻找“谁能笑到最后”",
    sourceUrl: "https://www.youtube.com/watch?v=H14bBuluwB8"
  },
  {
    id: "yt:duckworth:03",
    badge: "TED 演讲 · Angela Duckworth",
    title: "Grit Is Living Life Like a Marathon",
    text: "In all those very different contexts, one characteristic emerged as a significant predictor of success—and it wasn't social intelligence, good looks, physical health, or IQ. It was grit. Grit is passion and perseverance for very long-term goals. Grit is having stamina. Grit is sticking with your future, day in, day out—not just for the week, not just for the month, but for years—and working really hard to make that future a reality. Grit is living life like it's a marathon, not a sprint.",
    subtext: "坚毅（Grit）是对长期目标的激情与毅力——把人生当马拉松而不是百米冲刺",
    sourceUrl: "https://www.youtube.com/watch?v=H14bBuluwB8"
  },
  {
    id: "yt:duckworth:04",
    badge: "TED 演讲 · Angela Duckworth",
    title: "Talent Does Not Make You Gritty",
    text: "When I studied thousands of high school juniors in the Chicago Public Schools, grittier kids were significantly more likely to graduate, even when matched on family income, standardized test scores, and school safety. What I do know is that talent doesn't make you gritty. Our data show very clearly that there are many talented individuals who simply do not follow through on their commitments. In fact, in our data, grit is usually unrelated or even inversely related to measures of talent.",
    subtext: "数据表明天赋与坚毅往往无关甚至呈负相关，许多聪明人恰恰半途而废",
    sourceUrl: "https://www.youtube.com/watch?v=H14bBuluwB8"
  },
  {
    id: "yt:duckworth:05",
    badge: "TED 演讲 · Angela Duckworth",
    title: "Growth Mindset: Failure Is Not Permanent",
    text: "So far, the best idea I have heard about building grit in kids is something called 'growth mindset,' developed at Stanford University by Carol Dweck. It is the belief that the ability to learn is not fixed—that it can change with your effort. Dr. Dweck has shown that when kids read and learn about the brain and how it changes and grows in response to challenge, they are much more likely to persevere when they fail, because they don't believe that failure is a permanent condition. We have to be willing to fail, to be wrong, and to start over again with lessons learned.",
    subtext: "成长型思维相信能力会随努力而生长，失败只是暂时的状态而非终身标签",
    sourceUrl: "https://www.youtube.com/watch?v=H14bBuluwB8"
  },
  {
    id: "yt:adichie:01",
    badge: "TED 演讲 · Chimamanda Adichie",
    title: "White, Blue-Eyed Characters in Nigeria",
    text: "I'm a storyteller, and I would like to tell you a few personal stories about what I like to call the danger of the single story. I grew up on a university campus in eastern Nigeria. What I read were British and American children's books, and when I began to write at about age seven, I wrote exactly the kinds of stories I was reading: all my characters were white and blue-eyed, they played in the snow, they ate apples, and they talked a lot about the weather. This despite the fact that I lived in Nigeria, had never been outside Nigeria, ate mangoes, and didn't have snow. Because all I had read were books with foreign characters, I had become convinced that books by their very nature had to be about things with which I could not personally identify.",
    subtext: "童年只读英美绘本的尼日利亚女孩，曾以为书里的主角只能是金发碧眼的外国人 · TED",
    sourceUrl: "https://www.youtube.com/watch?v=LmjKUDo7gSQ"
  },
  {
    id: "yt:adichie:02",
    badge: "TED 演讲 · Chimamanda Adichie",
    title: "Saved from Having a Single Story of Books",
    text: "Things changed when I discovered African books—writers like Chinua Achebe and Camara Laye. I went through a mental shift in my perception of literature. I realized that people like me—girls with skin the color of chocolate, whose kinky hair could not form ponytails—could also exist in literature. I loved those American and British books; they stirred my imagination and opened up new worlds for me. Yet the discovery of African writers saved me from having a single story of what books are.",
    subtext: "读到非洲作家的作品后她才惊觉：像自己一样的人也可以成为文学的主角",
    sourceUrl: "https://www.youtube.com/watch?v=LmjKUDo7gSQ"
  },
  {
    id: "yt:adichie:03",
    badge: "TED 演讲 · Chimamanda Adichie",
    title: "Fide’s Family & The Patterned Basket",
    text: "I come from a conventional middle-class Nigerian family, and when I turned eight we got a new houseboy named Fide. The only thing my mother told us about him was that his family was very poor. Whenever I didn't finish my dinner, my mother would say, 'Finish your food! Don't you know people like Fide's family have nothing?' So I felt enormous pity for Fide's family. One Saturday we went to his village to visit, and his mother showed us a beautifully patterned basket made of dyed raffia that his brother had made. I was startled. It had not occurred to me that anybody in his family could actually make something. All I had heard was how poor they were, so poverty had become my single story of them.",
    subtext: "去帮工家做客时看到精美的手工编织篮，才发现“穷”成了她看待那家人的唯一标签",
    sourceUrl: "https://www.youtube.com/watch?v=LmjKUDo7gSQ"
  },
  {
    id: "yt:adichie:04",
    badge: "TED 演讲 · Chimamanda Adichie",
    title: "My American Roommate’s Single Story of Africa",
    text: "Years later, when I left Nigeria for university in the United States at nineteen, my American roommate was shocked by me. She asked where I had learned to speak English so well—confused when I said Nigeria had English as its official language—and was disappointed when she asked for my 'tribal music' and I produced my tape of Mariah Carey. She assumed I didn't know how to use a stove. She had felt sorry for me even before she saw me. Her default position toward me as an African was patronizing, well-meaning pity. My roommate had a single story of Africa—a single story of catastrophe—with no possibility of connection as human equals.",
    subtext: "美国室友对非洲的“单一灾难叙事”，让人在未曾了解前就只剩下居高临下的同情",
    sourceUrl: "https://www.youtube.com/watch?v=LmjKUDo7gSQ"
  },
  {
    id: "yt:adichie:05",
    badge: "TED 演讲 · Chimamanda Adichie",
    title: "How to Create a Single Story",
    text: "I too am just as guilty on the question of the single story. A few years ago I visited Mexico from the US when debates about immigration were tense and immigration had become synonymous with Mexicans. Walking around on my first day in Guadalajara, watching people going to work, rolling up tortillas in the marketplace, smoking, and laughing, I felt slight surprise—and then I was overwhelmed with shame. I realized I had been so immersed in media coverage that Mexicans had become one thing in my mind: the abject immigrant. That is how to create a single story: show a people as one thing, as only one thing, over and over again, and that is what they become.",
    subtext: "重复把一个群体塑造成同一种面孔，就会制造出“单一故事”——哪怕是作家本人也曾落入陷阱",
    sourceUrl: "https://www.youtube.com/watch?v=LmjKUDo7gSQ"
  },
  {
    id: "yt:adichie:06",
    badge: "TED 演讲 · Chimamanda Adichie",
    title: "Stories Are Defined by Power",
    text: "It is impossible to talk about the single story without talking about power. There is an Igbo word, 'nkali,' which loosely translates to 'to be greater than another.' Like our economic and political worlds, stories too are defined by the principle of nkali: how they are told, who tells them, when they're told, and how many stories are told are really dependent on power. Power is the ability not just to tell the story of another person, but to make it the definitive story of that person. Start the story with the arrows of the Native Americans, and not with the arrival of the British, and you have an entirely different story.",
    subtext: "谁掌握话语权，谁就能把自己的片面叙事变成他人唯一的“定论”",
    sourceUrl: "https://www.youtube.com/watch?v=LmjKUDo7gSQ"
  },
  {
    id: "yt:adichie:07",
    badge: "TED 演讲 · Chimamanda Adichie",
    title: "The Problem with Stereotypes Is Incompleteness",
    text: "I actually had a very happy childhood full of laughter and love in a close-knit family, yet I also had grandfathers who died in refugee camps and grew up under oppressive military governments where jam, margarine, bread, and milk disappeared from the breakfast table. All of these stories make me who I am; to insist on only the negative stories is to flatten my experience. The single story creates stereotypes, and the problem with stereotypes is not that they are untrue, but that they are incomplete. They make one story become the only story.",
    subtext: "刻板印象的问题不在于完全虚假，而在于片面——它把众多故事中的一个当成了全部",
    sourceUrl: "https://www.youtube.com/watch?v=LmjKUDo7gSQ"
  },
  {
    id: "yt:adichie:08",
    badge: "TED 演讲 · Chimamanda Adichie",
    title: "A Balance of Stories & Repairing Broken Dignity",
    text: "It is impossible to engage properly with a place or a person without engaging with all of the stories of that place and that person. The consequence of the single story is this: it robs people of dignity, makes recognition of our equal humanity difficult, and emphasizes how we are different rather than how we are similar. Stories matter. Many stories matter. Stories have been used to dispossess and to malign, yet stories can also be used to empower and to humanize. Stories can break the dignity of a people, and stories can also repair that broken dignity. When we reject the single story, we regain a kind of paradise.",
    subtext: "拒绝单一故事、倾听多元叙事，才能修复被剥夺的尊严，找回彼此平等的人性联结",
    sourceUrl: "https://www.youtube.com/watch?v=LmjKUDo7gSQ"
  },
  {
    id: "yt:conan:01",
    badge: "达特茅斯演讲 · Conan O’Brien",
    title: "Life Is Not Fair—Deal With It",
    text: "Congratulations to the Dartmouth class of 2011! Today you have achieved something special—something only ninety-two percent of Americans your age will ever know: a college diploma. With your college diploma, you now have a crushing advantage over eight percent of the workforce—dropout losers like Bill Gates, Steve Jobs, and Mark Zuckerberg. My first job as your commencement speaker is to illustrate that life is not fair. For example, you have worked tirelessly for four years to earn the diploma you'll receive this weekend, and Dartmouth is giving me the exact same degree for interviewing the fourth lead in Twilight. Deal with it.",
    subtext: "柯南·奥布莱恩用自嘲幽默开场：人生并不公平，学会接纳并坦然面对 · Dartmouth 2011",
    sourceUrl: "https://www.youtube.com/watch?v=FQO96hlT5SE"
  },
  {
    id: "yt:conan:02",
    badge: "达特茅斯演讲 · Conan O’Brien",
    title: "Real Practical Advice for Graduates & Parents",
    text: "Instead of empty cliches like 'Reach for the stars,' I'm going to give you practical advice to survive the next few years. First, adult acne lasts longer than you think. Second, you cannot iron a shirt while wearing it. Third, if you live on ramen noodles for too long, you lose all feeling in your hands. And parents, write this down: you haven't seen your children in four years—now you're about to see them every day when they come out of the basement to tell you the Wi-Fi isn't working. You will spend more money framing your child's diploma than they will earn in the next six months, so be patient.",
    subtext: "告别空洞鸡汤，送给毕业生与家长几条扎心又好笑的现实生存指南",
    sourceUrl: "https://www.youtube.com/watch?v=FQO96hlT5SE"
  },
  {
    id: "yt:conan:03",
    badge: "达特茅斯演讲 · Conan O’Brien",
    title: "Whatever Doesn’t Kill You Almost Kills You",
    text: "Eleven years ago I gave an address at Harvard, and I hadn't spoken at a graduation since because I thought I had nothing left to say. Then 2010 came, and I learned a hard but profound lesson. In 2000 I told graduates, 'Don't be afraid to fail.' Well, today I'm here to tell you that though you should not fear failure, you should do your very best to avoid it. Nietzsche famously said, 'Whatever doesn't kill you makes you stronger.' What he failed to stress is that it almost kills you. Disappointment stings, and for driven, successful people like yourselves, it is disorienting.",
    subtext: "尼采说“杀不死你的让你更强大”，却忘了告诉你：它差点真的把你杀死",
    sourceUrl: "https://www.youtube.com/watch?v=FQO96hlT5SE"
  },
  {
    id: "yt:conan:04",
    badge: "达特茅斯演讲 · Conan O’Brien",
    title: "Off the Grid & Finding My Conviction",
    text: "A little over a year ago, I experienced a profound and very public disappointment. I did not get what I wanted, and I left a system that had nurtured and helped define me for the better part of seventeen years. I went from being in the center of the grid to completely off the grid. Yet then something spectacular happened: fogbound, with no compass and adrift, I started trying things. I grew a strange beard, dove into social media, threw together a national tour, played the guitar, did stand-up, recorded an album, and took a job on basic cable. I abandoned all preconceived perceptions of my career path—and it was the most satisfying and fascinating year of my professional life. I have never had more fun, been more challenged, or had more conviction about what I was doing.",
    subtext: "失去主持了 17 年的舞台后，他在迷茫中打破固有路线，反而迎来职业生涯最充实的一年",
    sourceUrl: "https://www.youtube.com/watch?v=FQO96hlT5SE"
  },
  {
    id: "yt:conan:05",
    badge: "达特茅斯演讲 · Conan O’Brien",
    title: "Failure to Become Your Hero Defines You",
    text: "There are few things more liberating in this life than having your worst fear realized. Your path at twenty-two will not necessarily be your path at thirty-two or forty-two; one's dream is constantly evolving. Way back in the 1940s, Jack Benny was a giant star, and a young Johnny Carson wanted very much to be Jack Benny. Johnny emulated him, yet his own quirks and mannerisms pulled him in a different direction—and his failure to completely become his hero made him the funniest person of his generation. David Letterman wanted to be Johnny Carson and was not; my generation wanted to be Letterman and none of us are. It is our failure to become our perceived ideal that ultimately defines us and makes us unique.",
    subtext: "没能活成偶像的样子，恰恰成就了每个人无可替代的独特风格",
    sourceUrl: "https://www.youtube.com/watch?v=FQO96hlT5SE"
  },
  {
    id: "yt:conan:06",
    badge: "达特茅斯演讲 · Conan O’Brien",
    title: "No Specific Job Defines You",
    text: "At the age of forty-seven, after twenty-five years of obsessively pursuing my dream, that dream changed. For decades in show business, hosting The Tonight Show was the holy grail, and I thought achieving that goal would define me as successful. Yet that is not true: no specific job or career goal defines me, and it should not define you. Today I tell you that whether you fear it or not, disappointment will come. The beauty is that through disappointment you can gain clarity, and with clarity comes conviction and true originality.",
    subtext: "没有任何一个头衔或岗位能定义你的价值；失望之后收获的清醒，会带来真正的笃定与原创力",
    sourceUrl: "https://www.youtube.com/watch?v=FQO96hlT5SE"
  },
  {
    id: "yt:conan:07",
    badge: "达特茅斯演讲 · Conan O’Brien",
    title: "Work Hard, Be Kind, and Amazing Things Will Happen",
    text: "Whatever you think your dream is now, it will probably change, and that's okay. Through the good and especially the bad, the person you are now is someone you could never have conjured four years ago. I'd like to end by quoting myself from the end of my final program with NBC seventeen months ago: 'Work hard, be kind, and amazing things will happen.' Speaking to the Dartmouth class of 2011, I have never believed that more.",
    subtext: "不管梦想如何演变，记住这句话：努力工作，保持善良，奇迹自会发生",
    sourceUrl: "https://www.youtube.com/watch?v=FQO96hlT5SE"
  }
,
  {
    id: "yt:treasure:01",
    badge: "TED 演讲 · Julian Treasure",
    title: "The Human Voice: Our Most Powerful Instrument",
    text: "The human voice is the instrument we all play. It is probably the most powerful sound in the world—the only one that can start a war or say 'I love you.' Yet many people have the experience that when they speak, people don't listen to them. Why is that, and how can we speak powerfully to make change in the world? I want to suggest there are a number of habits we need to move away from. I've assembled seven deadly sins of speaking—not an exhaustive list, but seven large habits we can all fall into.",
    subtext: "人声是世界上最强大的乐器，但为什么很多人说话时别人却不愿听？· TED",
    sourceUrl: "https://www.youtube.com/watch?v=eIho2S0ZahI"
  },
  {
    id: "yt:treasure:02",
    badge: "TED 演讲 · Julian Treasure",
    title: "Deadly Sins 1–3: Gossip, Judging, and Negativity",
    text: "First, gossip: speaking ill of somebody who is not present. It is not a nice habit, and we know perfectly well that the person gossiping five minutes later will be gossiping about us. Second, judging: we know people who are like this in conversation, and it is very hard to listen to somebody if you know you are being judged and found wanting at the same time. Third, negativity: you can fall into this easily. My mother in the last years of her life became very negative, and I remember saying to her, 'It's October the first today,' and she replied, 'I know, isn't it dreadful?' It is hard to listen when somebody is that negative.",
    subtext: "说话的七宗罪前三项：背后议论、评判他人与习惯性消极",
    sourceUrl: "https://www.youtube.com/watch?v=eIho2S0ZahI"
  },
  {
    id: "yt:treasure:03",
    badge: "TED 演讲 · Julian Treasure",
    title: "Deadly Sins 4–7: Complaining, Excuses, Exaggeration, Dogmatism",
    text: "Another form of negativity is complaining. In the UK it is practically our national sport—we complain about the weather, sport, politics, everything—yet complaining is viral misery, not spreading sunshine and lightness in the world. Fifth, excuses: some people have a 'blame thrower' and just pass responsibility to everybody else instead of owning their actions. Sixth, embroidery or exaggeration, which demeans our language; if I call everything awesome, what word is left for something truly awe-inspiring? Worse, exaggeration becomes out-and-out lying. Finally, dogmatism: the confusion of facts with opinions. When somebody bombards you with their opinions as if they were absolute truth, you end up listening into the wind.",
    subtext: "后四项恶习：抱怨（病毒式传播痛苦）、推诿借口、夸大其词与固执己见",
    sourceUrl: "https://www.youtube.com/watch?v=eIho2S0ZahI"
  },
  {
    id: "yt:treasure:04",
    badge: "TED 演讲 · Julian Treasure",
    title: "HAIL: Four Cornerstones of Powerful Speech",
    text: "Is there a positive way to think about this? Yes—there are four powerful cornerstones we can stand on if we want our speech to be powerful and create change. Fortunately, they spell the word HAIL, which has a great definition: not the ice falling from the sky, but 'to greet or acclaim enthusiastically'—which is how our words will be received if we stand on these four foundations. H stands for Honesty: being true in what you say, straight and clear. A stands for Authenticity: just being yourself, or as a friend of mine put it, standing in your own truth.",
    subtext: "让表达充满力量的四大基石 HAIL：诚实（Honesty）与真实做自己（Authenticity）",
    sourceUrl: "https://www.youtube.com/watch?v=eIho2S0ZahI"
  },
  {
    id: "yt:treasure:05",
    badge: "TED 演讲 · Julian Treasure",
    title: "Integrity and Love: Tempering Honesty with Care",
    text: "The I in HAIL is Integrity: being your word, actually doing what you say, and being somebody people can trust. And the L is Love—I don't mean romantic love, I mean wishing people well, for two reasons. First, absolute honesty untempered may not be what we want: saying 'My goodness, you look ugly this morning' is rarely necessary; tempered with love, honesty becomes a great thing. Second, if you are genuinely wishing somebody well, it is very hard to judge them at the same time. I'm not even sure you can do both simultaneously.",
    subtext: "正直（Integrity）与善意（Love）：带着善意的诚实，才不会变成伤人的评判",
    sourceUrl: "https://www.youtube.com/watch?v=eIho2S0ZahI"
  },
  {
    id: "yt:treasure:06",
    badge: "TED 演讲 · Julian Treasure",
    title: "The Vocal Toolbox: Register and Timbre",
    text: "It is not only what you say; it is also the way that you say it. You have an amazing toolbox in this instrument, yet very few people ever open it. Let's pull out a few tools you can play with to increase the power of your speaking. First, register: if I talk up in my nose you hear one sound, and most of us speak from our throat most of the time, but if you want weight you need to drop down into your chest. Research shows we vote for politicians with lower voices because we associate depth with power and authority. Second, timbre—the way your voice feels. Studies show we prefer voices that are rich, smooth, and warm like hot chocolate, and you can train this through breathing, posture, and vocal exercises.",
    subtext: "声音工具箱前两件法宝：胸腔共鸣（Register）与温暖饱满的音色（Timbre）",
    sourceUrl: "https://www.youtube.com/watch?v=eIho2S0ZahI"
  },
  {
    id: "yt:treasure:07",
    badge: "TED 演讲 · Julian Treasure",
    title: "Prosody, Pace, and the Power of Silence",
    text: "Next is prosody: the sing-song meta-language we use to impart meaning. It is route one for meaning in conversation. People who speak all on one note are very hard to listen to—that is where the word 'monotonous' comes from. We also see repetitive prosody where every statement ends with a rising inflection as if it were a question, which restricts your ability to communicate clearly. Then there is pace: I can sound excited by speaking very quickly, or slow right down to emphasize a point—and at the end of that, of course, is our old friend silence. There is nothing wrong with a bit of silence in a talk; we don't have to fill every gap with 'ums' and 'ahs.'",
    subtext: "抑扬顿挫（Prosody）、语速变化与留白的力量：不必用“嗯、啊”填满停顿",
    sourceUrl: "https://www.youtube.com/watch?v=eIho2S0ZahI"
  },
  {
    id: "yt:treasure:08",
    badge: "TED 演讲 · Julian Treasure",
    title: "Pitch, Volume, and Six Vocal Warm-Ups",
    text: "Pitch often goes along with pace, yet pitch alone can shift meaning completely—compare 'Where did you leave my keys?' with different stress. And volume lets you draw attention either by projecting energy or by getting very quiet—just avoid 'sodcasting,' imposing loud sound on people around you carelessly. Whenever you have something truly important—a stage talk, a marriage proposal, asking for a raise, or a wedding speech—warm up your voice first. Raise your arms, take a deep breath, and sigh out. Warm up your lips with a gentle buzz, stretch your tongue, roll your Rs like champagne for the tongue, and finish with the siren from high 'wee' down to low 'oo.'",
    subtext: "音高与音量的掌控，以及重要演讲前必做的六个声带热身动作",
    sourceUrl: "https://www.youtube.com/watch?v=eIho2S0ZahI"
  },
  {
    id: "yt:treasure:09",
    badge: "TED 演讲 · Julian Treasure",
    title: "Creating Sound Consciously for a Listening World",
    text: "Let me put this in context to close. Right now, too often we speak not very well into people who simply aren't listening, in environments full of noise and bad acoustics. What would the world be like if we were speaking powerfully to people who were listening consciously, in environments actually fit for purpose? Even larger: what would the world be like if we were creating sound consciously, consuming sound consciously, and designing all our environments consciously for sound? That would be a world that sounds beautiful—and one where understanding would be the norm.",
    subtext: "结语：有意识地发声、有意识地倾听，创造一个以理解为基础的美好世界",
    sourceUrl: "https://www.youtube.com/watch?v=eIho2S0ZahI"
  },
  {
    id: "yt:oprah:01",
    badge: "哈佛毕业演讲 · Oprah Winfrey",
    title: "From Rural Mississippi to Harvard Yard",
    text: "To President Faust, my fellow honorands, Harvard faculty, alumni, and members of the Harvard class of 2013: hello! I thank you for allowing me to be part of the conclusion of this chapter of your lives and the commencement of your next chapter. To say that I am honored doesn't even begin to quantify the depth of gratitude that accompanies an honorary doctorate from Harvard. Not too many little girls from rural Mississippi have made it all the way here to Cambridge. As I sat on the stage this morning, getting teary for you all and then teary for myself, I realized today is a defining milestone in a very long and blessed journey.",
    subtext: "从密西西比乡村一路走到哈佛领受荣誉博士学位，向 2013 届毕业生致辞",
    sourceUrl: "https://www.youtube.com/watch?v=GMWFieBGR7c"
  },
  {
    id: "yt:oprah:02",
    badge: "哈佛毕业演讲 · Oprah Winfrey",
    title: "A Speech for the Quad",
    text: "My one hope today is that I can be a source of some inspiration. I am going to address my remarks to anybody who has ever felt inferior, or felt disadvantaged, or felt screwed by life: this is a speech for the quad. I felt a lot of pressure over the past few weeks to come up with something you hadn't heard before, because after all, you all went to Harvard and I did not. But then I realized that you don't necessarily have to go to Harvard to have a driven, obsessive, type-A personality—though it helps. While I may not have graduated from here, I admit my personality is about as Harvard as they come.",
    subtext: "这段演讲献给每一个曾感到自卑、处境不利或被生活刁难过的人",
    sourceUrl: "https://www.youtube.com/watch?v=GMWFieBGR7c"
  },
  {
    id: "yt:oprah:03",
    badge: "哈佛毕业演讲 · Oprah Winfrey",
    title: "Age Sixteen: Discovering the Desire to Make a Difference",
    text: "My television career began unexpectedly when I was sixteen years old in Nashville, Tennessee, in the Miss Fire Prevention contest. During the question-and-answer period, they asked, 'Young lady, what would you like to be when you grow up?' By the time they got to me, all the good answers were gone. I had seen Barbara Walters on The Today Show that morning, so I answered: 'I would like to be a journalist. I would like to tell other people's stories in a way that makes a difference in their lives and the world.' As those words came out of my mouth, I thought, 'Whoa, this is pretty good.' I was on television by the time I was nineteen.",
    subtext: "16 岁选美问答中脱口而出的志向，让她在 19 岁就站上了电视荧屏",
    sourceUrl: "https://www.youtube.com/watch?v=GMWFieBGR7c"
  },
  {
    id: "yt:oprah:04",
    badge: "哈佛毕业演讲 · Oprah Winfrey",
    title: "Twenty-Five Years at Number One, Then Launching OWN",
    text: "In 1986 I launched my own television show with a relentless determination to succeed. At first I was nervous about the competition, and then I became my own competition—raising the bar every year, pushing myself as hard as I knew how. Eventually we made it to the top and stayed there for twenty-five years; The Oprah Winfrey Show was number one in our time slot for twenty-one years. I became pretty comfortable with that level of success. But a few years ago I decided, as you will at some point, that it was time to recalculate, find new territory, and break new ground. So I ended the show and launched OWN, the Oprah Winfrey Network.",
    subtext: "《奥普拉秀》稳居榜首 21 年后，她选择离开舒适区去创办全新电视网 OWN",
    sourceUrl: "https://www.youtube.com/watch?v=GMWFieBGR7c"
  },
  {
    id: "yt:oprah:05",
    badge: "哈佛毕业演讲 · Oprah Winfrey",
    title: "Embarrassment, the Shower, and Turning It Around",
    text: "One year after launching OWN, nearly every media outlet had proclaimed that my new venture was not just a flop, but a 'big, bold flop.' I still remember opening USA Today and reading the headline: 'Oprah Not Quite Standing on Her Own.' That time was the worst period in my professional life. I was stressed, frustrated, and embarrassed. Right around then, President Faust called and asked me to speak at Harvard. I thought, 'What could I possibly say to Harvard graduates in the very moment when I have stopped succeeding?' I got off the phone and went to the shower, and the words of an old hymn came to me: 'Trouble don't last always—this too shall pass.' I vowed to turn the network around before standing here—and I am here today to tell you I did.",
    subtext: "面对媒体嘲讽和低谷，她从旧圣歌“困难不会永远持续”中重拾斗志并扭转局面",
    sourceUrl: "https://www.youtube.com/watch?v=GMWFieBGR7c"
  },
  {
    id: "yt:oprah:06",
    badge: "哈佛毕业演讲 · Oprah Winfrey",
    title: "There Is No Such Thing as Failure",
    text: "This is what I want to share: it doesn't matter how far you might rise, at some point you are bound to stumble. Because if you are constantly raising the bar and pushing yourself higher, the law of averages predicts you will at some point fall. And when you do, remember this: there is no such thing as failure. Failure is just life trying to move us in another direction. When you're down in a hole, it looks like failure—this past year I had to spoon-feed those words to myself. It is okay to feel bad for a little while and mourn what you think you lost. Then learn from every mistake, figure out the next right move, and rely on your internal moral and emotional GPS.",
    subtext: "世上没有所谓的失败，失败只是生活在试图把你推向另一个方向",
    sourceUrl: "https://www.youtube.com/watch?v=GMWFieBGR7c"
  },
  {
    id: "yt:oprah:07",
    badge: "哈佛毕业演讲 · Oprah Winfrey",
    title: "Building a Resume of Who You Want to Be, Not Just What",
    text: "Forevermore, when you Google yourself, your search results will read 'Harvard 2013,' and in a competitive world that is an impressive calling card that can lead to even more impressive titles: lawyer, senator, CEO, scientist, Nobel winner, or late-night host. Yet the challenge of life is to build a resume that doesn't simply tell a story about what you want to be, but who you want to be—a resume that tells not just what you want to accomplish, but why. A story that is not merely a collection of titles and positions, but a story about your purpose. Because when you inevitably stumble and find yourself stuck in a hole, that sense of purpose is what gets you out.",
    subtext: "人生的挑战不只是堆砌头衔，而是写出一份关于“你想成为谁”与“为何而做”的履历",
    sourceUrl: "https://www.youtube.com/watch?v=GMWFieBGR7c"
  },
  {
    id: "yt:oprah:08",
    badge: "哈佛毕业演讲 · Oprah Winfrey",
    title: "The Nine-Year-Old Girl and The Angel Network",
    text: "For me, that discovery came in 1994 when I interviewed a nine-year-old girl who had decided to collect pocket change to help people in need and raised a thousand dollars all by herself. I thought, 'If a nine-year-old girl with a bucket and a big heart can do that, what could I do?' So I asked our viewers to collect their own spare change. In one month, just from pennies, nickels, and dimes, we raised over three million dollars to send one student from every U.S. state to college. That became The Angel Network. Together with viewers who gave their time, talent, and kindness, we built fifty-five schools in twelve countries and restored nearly three hundred homes after Hurricanes Rita and Katrina.",
    subtext: "1994 年一位 9 岁女孩收集零钱善举启发了“天使网络”，筹款建起 55 所学校",
    sourceUrl: "https://www.youtube.com/watch?v=GMWFieBGR7c"
  },
  {
    id: "yt:oprah:09",
    badge: "哈佛毕业演讲 · Oprah Winfrey",
    title: "Use Television, Don’t Be Used by It",
    text: "I had been on the air for a long time, yet it was The Angel Network that focused my internal GPS. I want you to know clarity doesn't always come at the beginning—I started on TV at nineteen, and around 1994 I finally got crystal clear. What became clear to me was that I was here on Earth to use television and not be used by it—to use it to illuminate the transcendent power of our better angels. The Angel Network didn't just change the lives of those who were helped; it changed the lives of everyone who did the helping, reminding us how powerful it is to come together in common purpose.",
    subtext: "“驾驭电视而不是被电视驾驭”：真正的使命感往往在行动途中才逐渐清晰",
    sourceUrl: "https://www.youtube.com/watch?v=GMWFieBGR7c"
  },
  {
    id: "yt:oprah:10",
    badge: "哈佛毕业演讲 · Oprah Winfrey",
    title: "Banishing Darkness with Light",
    text: "I recently saw an interview with David and Francine Wheeler, who lost their seven-year-old son Ben in the Sandy Hook tragedy. Even after gun-safety legislation failed in Congress, they refused to be discouraged. Francine said, 'Our hearts are broken, but our spirits are not. I'm going to find a conversation about change that is love, without fighting them.' Her husband David added, 'You simply cannot demonize or vilify someone who doesn't agree with you, because the minute you do that, your discussion is over. There has to be some way that this darkness can be banished with light.'",
    subtext: "在巨大悲痛面前依然拒绝妖魔化异见者，用爱与光明驱散黑暗",
    sourceUrl: "https://www.youtube.com/watch?v=GMWFieBGR7c"
  },
  {
    id: "yt:oprah:11",
    badge: "哈佛毕业演讲 · Oprah Winfrey",
    title: "When You Learn, Teach; When You Get, Give",
    text: "In our political system and media we often see a country that looks polarized and paralyzed, yet we all know we are better than that cynicism. Each of you has been blessed with the enormous opportunity of attending this school, and now you have a chance to better your own life, the lives of your neighbors, and the life of our country. Maya Angelou always says: 'When you learn, teach; when you get, give.' That is what gives your story purpose and meaning. I built a platform reaching twenty million viewers a day in an analog world; today, with digital tools, you can reach billions in seconds.",
    subtext: "玛雅·安吉罗名言：“学有所得便教于人，有所收获便施予人”",
    sourceUrl: "https://www.youtube.com/watch?v=GMWFieBGR7c"
  },
  {
    id: "yt:oprah:12",
    badge: "哈佛毕业演讲 · Oprah Winfrey",
    title: "35,000 Interviews: The Universal Question “Was That Okay?”",
    text: "The single most important lesson I learned in twenty-five years of talking to people every single day is that there is a common denominator in our human experience. Across more than 35,000 interviews, as soon as the camera shuts off, everyone turns to me and asks in their own way: 'Was that okay?' I heard it from President Bush and President Obama; I heard it from heroes and housewives, from victims and perpetrators; I even heard it from Beyoncé, who finished performing, handed me the microphone, and asked, 'Was that okay?' Every encounter asks the same thing: Did you hear me? Do you see me? Did what I say mean anything to you?",
    subtext: "35,000 场采访后的最大发现：无论总统还是巨星，每个人都在问“我刚才表现还好吗？你看见我了吗？”",
    sourceUrl: "https://www.youtube.com/watch?v=GMWFieBGR7c"
  },
  {
    id: "yt:oprah:13",
    badge: "哈佛毕业演讲 · Oprah Winfrey",
    title: "Have Face-to-Face Conversations & Be Yourself",
    text: "Even though this is the college where Facebook was born, my hope is that you will go out and have more face-to-face conversations with people you disagree with—that you have the courage to look them in the eye, hear their point of view, and never lose the ability to stand in somebody else's shoes. And remember to be yourself. When I started reading the news, I tried to sit, talk, and move like Barbara Walters—until one night I mispronounced 'Canada' as 'Cananda,' cracked myself up live on air, and realized I could be a much better Oprah than a pretend Barbara.",
    subtext: "多做面对面的真诚对话，也别模仿别人——做真实的自己比扮演偶像更出色",
    sourceUrl: "https://www.youtube.com/watch?v=GMWFieBGR7c"
  },
  {
    id: "yt:oprah:14",
    badge: "哈佛毕业演讲 · Oprah Winfrey",
    title: "What Makes You Come Alive",
    text: "I know you may feel some anxiety and hesitation about leaving the comfort of college and putting your credentials to the test. Yet no matter what challenges, setbacks, or disappointments you encounter along the way, you will find true success and happiness if you hold one goal: to fulfill the highest, most truthful expression of yourself as a human being—to max out your humanity by using your energy to lift yourself, your family, and the people around you. Theologian Howard Thurman said it best: 'Don't ask yourself what the world needs; ask yourself what makes you come alive, and then go do that, because what the world needs is people who have come alive.'",
    subtext: "不要只问世界需要什么，去问什么让你真正焕发生机，然后全力以赴去做",
    sourceUrl: "https://www.youtube.com/watch?v=GMWFieBGR7c"
  },
  {
    id: "yt:oprah:15",
    badge: "哈佛毕业演讲 · Oprah Winfrey",
    title: "Michael Stolzenberg & Khadijah Williams: Faith in Your Generation",
    text: "The world needs people like thirteen-year-old Michael Stolzenberg, who lost both hands and feet to a bacterial infection at age eight, learned to walk and play lacrosse on prosthetics, and launched MikeysRun.com with his brother to raise one million dollars for Boston Marathon bombing amputees, saying: 'First they will be sad... I was scared too, but they'll be okay, they just don't know that yet.' And I have faith because of Harvard graduate Khadijah Williams, who attended twelve schools in twelve years, lived out of garbage bags, and bathed in Walmart before class—and today graduates as part of the class of 2013. Listen to that still, small GPS within yourself, and you will make a difference in the world.",
    subtext: "十三岁截肢少年迈克尔与克服无家可归考入哈佛的卡迪佳：倾听内心的罗盘，你必将改变世界",
    sourceUrl: "https://www.youtube.com/watch?v=GMWFieBGR7c"
  }
,
  {
    id: "yt:urban:01",
    badge: "TED 演讲 · Tim Urban",
    title: "The Ninety-Page Senior Thesis in 72 Hours",
    text: "In college I was a government major, which meant I had to write a lot of papers. Normal students spread the work out across the semester so things stay civil, and I always planned to do that—yet every paper turned into a last-minute sprint. Then came my ninety-page senior thesis, a paper you are supposed to spend a year on. I drew a staircase plan: start light, ramp up in the middle, kick into high gear at the end. Instead, months came and went, and I woke up with three days until the deadline without having written a word. So I pulled two all-nighters, wrote ninety pages in seventy-two hours, sprinted across campus, and turned it in right at the deadline. A week later the school called and said it was the best thesis they'd ever seen—except that did not happen. It was a very, very bad thesis.",
    subtext: "大学毕业论文拖到最后 72 小时熬两个通宵写完 90 页，结果当然是一团糟 · TED",
    sourceUrl: "https://www.youtube.com/watch?v=arj7oStGLkU"
  },
  {
    id: "yt:urban:02",
    badge: "TED 演讲 · Tim Urban",
    title: "The Rational Decision-Maker vs. The Instant Gratification Monkey",
    text: "Today I write the blog Wait But Why, and I wanted to explain to non-procrastinators what goes on inside a procrastinator's head. Both brains have a Rational Decision-Maker, yet the procrastinator's brain also has an Instant Gratification Monkey. When the Rational Decision-Maker says it is time to do something productive, the monkey takes the wheel and says, 'Actually, let's read the entire Wikipedia page on an old skating scandal, check the fridge to see if anything new appeared in the last ten minutes, and go down a YouTube spiral starting with Richard Feynman on magnets and ending with interviews of Justin Bieber's mom.' All of that takes so long that there is no room on the schedule for work today.",
    subtext: "拖延症大脑里的两个角色：理性决策者与只顾当下享乐的“及时行乐猴”",
    sourceUrl: "https://www.youtube.com/watch?v=arj7oStGLkU"
  },
  {
    id: "yt:urban:03",
    badge: "TED 演讲 · Tim Urban",
    title: "Easy and Fun vs. The Dark Playground",
    text: "The Instant Gratification Monkey lives entirely in the present moment, with no memory of the past and no knowledge of the future, caring only about two things: easy and fun. In tribal times, keeping well slept and well fed worked fine, yet we live in an advanced civilization where the Rational Decision-Maker can visualize the future and make long-term plans. Sometimes easy and fun overlaps with what makes sense, like enjoying well-earned leisure. Other times it makes much more sense to do harder things for the big picture—and that conflict leaves the procrastinator stuck in the Dark Playground, where leisure happens when it isn't supposed to, and the air is filled with guilt, dread, anxiety, and self-hatred.",
    subtext: "在“黑暗游乐场”里玩乐并不快乐，因为空气里弥漫着内疚、焦虑与自我厌恶",
    sourceUrl: "https://www.youtube.com/watch?v=arj7oStGLkU"
  },
  {
    id: "yt:urban:04",
    badge: "TED 演讲 · Tim Urban",
    title: "The Panic Monster Wakes Up",
    text: "With the monkey behind the wheel, how does the procrastinator ever enter the harder zone where important work gets done? Turns out the procrastinator has a guardian angel watching over him in his darkest moments: the Panic Monster. The Panic Monster stays dormant most of the time, yet wakes up anytime a deadline gets too close or there is danger of public embarrassment or career disaster—and importantly, he is the only thing the monkey is terrified of. When TED invited me to speak six months in advance, the monkey had me zooming into Google Earth over India for two and a half hours. One month out, TED posted my face on the speaker page, the Panic Monster went berserk, the monkey fled up the tree, and I finally got to work.",
    subtext: "唯一能让及时行乐猴吓得爬上树的，只有死线临近时苏醒的“恐慌怪兽”",
    sourceUrl: "https://www.youtube.com/watch?v=arj7oStGLkU"
  },
  {
    id: "yt:urban:05",
    badge: "TED 演讲 · Tim Urban",
    title: "The Two Kinds of Procrastination—And No-Deadline Regret",
    text: "After I wrote that blog post, thousands of emails arrived from nurses, bankers, painters, engineers, and PhD students around the world, written with heavy frustration about what procrastination had done to their lives. I wondered: if the Panic Monster system works, why are so many people in a dark place? It turns out there are two kinds of procrastination. When there are deadlines, the Panic Monster limits the damage to the short term. Yet there is a second kind of procrastination where there is no deadline—starting an entrepreneurial or creative venture, exercising, caring for your health, or investing in family and relationships. Without a deadline, the Panic Monster never wakes up, so long-term procrastination makes people feel like spectators in their own lives.",
    subtext: "没有死线的长期拖延才最致命：健康、梦想与亲密关系里，恐慌怪兽永远不会出现",
    sourceUrl: "https://www.youtube.com/watch?v=arj7oStGLkU"
  },
  {
    id: "yt:urban:06",
    badge: "TED 演讲 · Tim Urban",
    title: "The Life Calendar: Start Watching the Monkey Today",
    text: "Reading those emails gave me an epiphany: I don't think non-procrastinators exist. Everyone is procrastinating on something in life. You may have a healthy relationship with deadlines, yet remember that the monkey's sneakiest trick is played when deadlines aren't there. Look at a Life Calendar: one box for every week of a ninety-year life. That is not that many boxes—especially since we have already used a bunch of them. We all need to take a long, hard look at that calendar, think about what we are truly procrastinating on, and stay aware of the Instant Gratification Monkey. Because there aren't many boxes left, that is a job that should probably start today.",
    subtext: "90 年的人生日历格子其实没那么多，今天就该开始警惕那只及时行乐猴",
    sourceUrl: "https://www.youtube.com/watch?v=arj7oStGLkU"
  },
  {
    id: "yt:dweck:01",
    badge: "TED 演讲 · Carol Dweck",
    title: "The Power of “Not Yet” vs. The Tyranny of “Now”",
    text: "I heard about a high school in Chicago where students who didn't pass a course received the grade 'Not Yet.' I thought that was fantastic, because if you get a failing grade, you think, 'I'm nothing, I'm nowhere.' When you get 'Not Yet,' you understand that you are on a learning curve—it gives you a path into the future. Early in my career, I gave ten-year-olds problems slightly too hard for them. Some reacted positively, saying 'I love a challenge,' because they had a growth mindset and knew abilities can be developed. Others saw it as catastrophic: gripped in the tyranny of now, they ran from difficulty, looked for someone who did worse, or said they would cheat next time.",
    subtext: "“尚未达到（Not Yet）”给你一条通往未来的学习曲线，而非“不及格”的死刑判决 · TED",
    sourceUrl: "https://www.youtube.com/watch?v=_X0mgOOSpLU"
  },
  {
    id: "yt:dweck:02",
    badge: "TED 演讲 · Carol Dweck",
    title: "Your Brain on Fire with “Yet”",
    text: "Scientists measured electrical activity in the brain as students confronted an error. In fixed-mindset students, there is hardly any activity—they run from the error and don't engage with it. By contrast, in students with a growth mindset, their brain is on fire with 'yet': they engage deeply, process the error, learn from it, and correct it. How are we raising our kids—for 'now' instead of 'yet'? Employers tell me we have raised a generation of young workers who can't get through the day without an award. To build a bridge to 'yet,' we must praise wisely: don't praise intelligence or talent, which fails. Praise the process—effort, strategies, focus, perseverance, and improvement.",
    subtext: "面对错误时，成长型思维的大脑会剧烈活跃；赞美努力与策略，而非空洞夸奖“聪明”",
    sourceUrl: "https://www.youtube.com/watch?v=_X0mgOOSpLU"
  },
  {
    id: "yt:dweck:03",
    badge: "TED 演讲 · Carol Dweck",
    title: "Neurons Growing Stronger & Transforming Effort",
    text: "We can actually change students' mindsets. In one study, we taught students that every time they push out of their comfort zone to learn something new and difficult, the neurons in their brain form new, stronger connections, and over time they get smarter. Students taught this growth mindset showed a sharp rebound in grades, while the control group continued to decline. Across Harlem, the South Bronx, and Native American reservation schools, transforming the meaning of effort and difficulty took classrooms from the bottom to the top of their states. Effort and difficulty no longer make you feel dumb—they mean your neurons are getting stronger. Everyone deserves to live in places filled with 'yet.'",
    subtext: "每次走出舒适区挑战难题，大脑神经元都在建立更强的连接，让你真正变得更聪明",
    sourceUrl: "https://www.youtube.com/watch?v=_X0mgOOSpLU"
  }
,
  {
    id: "yt:dweck:04",
    badge: "TED 演讲 · Carol Dweck",
    title: "Rewarding Effort, Strategy, and Progress in Math",
    text: "There are other ways to reward 'yet.' We recently teamed up with game scientists from the University of Washington to create a new online math game that rewarded 'yet.' Typical math games reward you for getting answers right right now; this game rewarded effort, strategy, and progress. As a result, we saw more effort, better strategies, deeper engagement over longer periods of time, and stronger perseverance whenever students hit really, really hard problems. Just the words 'yet' or 'not yet,' we are finding, give students greater confidence and a clear path into the future.",
    subtext: "与华盛顿大学合作开发的数学游戏：奖励努力、策略与进步，而非只看当下对错",
    sourceUrl: "https://www.youtube.com/watch?v=_X0mgOOSpLU"
  },
  {
    id: "yt:dweck:05",
    badge: "TED 演讲 · Carol Dweck",
    title: "How Growth Mindset Classrooms Create Equality",
    text: "In our country, some groups of students chronically underperform—for example, children in inner cities or on Native American reservations—and many people assume it is inevitable. Yet when educators build growth-mindset classrooms steeped in 'yet,' equality happens. In one year, a kindergarten class in Harlem, New York—where many children could not even hold a pencil when they arrived—scored in the ninety-fifth percentile on the national achievement test. In one year, fourth graders in the South Bronx went from way behind to number one in New York State on the math test, and Native American students in Washington State rose from the bottom of their district to outscore affluent Seattle schools.",
    subtext: "成长型思维如何带来教育公平：哈莱姆、布朗克斯与原住民学校一年内跃居州榜首",
    sourceUrl: "https://www.youtube.com/watch?v=_X0mgOOSpLU"
  },
  {
    id: "yt:dweck:06",
    badge: "TED 演讲 · Carol Dweck",
    title: "A Thirteen-Year-Old Boy’s Letter About Effort",
    text: "I received a letter recently from a thirteen-year-old boy who wrote: 'Dear Professor Dweck, I appreciate that your writing is based on solid scientific research, and that is why I decided to put it into practice. I put more effort into my schoolwork, into my relationship with my family, and into my relationships with kids at school, and I experienced great improvement in all of those areas. I now realize I have wasted most of my life.' Let us not waste any more lives—because once we know abilities are capable of such growth, it becomes a basic human right for everyone to live in places filled with 'yet.'",
    subtext: "13 岁少年的来信：把科学方法付诸实践后，学业、家庭与人际关系全面改善",
    sourceUrl: "https://www.youtube.com/watch?v=_X0mgOOSpLU"
  },
  {
    id: "yt:oprah:16",
    badge: "哈佛毕业演讲 · Oprah Winfrey",
    title: "Closing Blessing for the Class of 2013",
    text: "From time to time you may stumble and fall—you will, for sure, count on that, no doubt. You will have questions and you will have doubts about your path. Yet I know this: if you are willing to listen to and be guided by that still, small voice that is the GPS within yourself—to find out what makes you come alive—you will be more than okay. You will be happy, you will be successful, and you will make a difference in the world. Congratulations, Class of 2013, congratulations to your family and friends, good luck, and thank you for listening.",
    subtext: "哈佛毕业演讲尾声：倾听内心深处那个小小的声音，你一定会活出精彩、改变世界",
    sourceUrl: "https://www.youtube.com/watch?v=GMWFieBGR7c"
  }
]);

/**
 * Curated NotebookLM Spoken English Phrases, Pronunciation Drills & Long Dialogue.
 * Grounded in the learner's English notebooks (Dropped D, Everyday Fluency, Grad/Gress Roots, Natural Dialogue).
 */
export const BUILT_IN_NOTEBOOK_SPOKEN = Object.freeze([
  // 1. Silent Consonants — Dropped D in American English (N + D + Consonant)
  {
    id: 'nb:dropped-d:01',
    badge: 'Notebook 口语 · 美音连读',
    title: 'Dropped D: friendship & my friend was',
    text: 'In natural American English, we drop the D between N and another consonant for smoothness. Listen closely: friendship, friendly, and my friend was there last week.',
    subtext: 'N + D + 辅音省掉 D 音（friennnship / my frien-was），但接元音时保留 D（my friend is here）',
    sourceUrl: 'https://www.youtube.com/watch?v=cztw76aM-18'
  },
  {
    id: 'nb:dropped-d:02',
    badge: 'Notebook 口语 · 美音连读',
    title: 'Dropped D: errands & all kinds of problems',
    text: 'Whew, I have a lot of errands to run today. And honestly, there are all kinds of problems we need to sort out before Friday.',
    subtext: '高频地道口语：have errands to run（有很多杂事要办）/ all kinds of problems（各种问题），errands 与 kinds 省读 D',
    sourceUrl: 'https://www.youtube.com/watch?v=cztw76aM-18'
  },
  {
    id: 'nb:dropped-d:03',
    badge: 'Notebook 口语 · 美音连读',
    title: 'Dropped D: around nine & found my phone',
    text: 'Let us meet around nine o-clock, or maybe around one. Hold on—I finally found my phone right behind the sofa.',
    subtext: '连读实战：around nine / around one（one 发 /w/ 辅音故省 D）/ found my phone / behind the',
    sourceUrl: 'https://www.youtube.com/watch?v=cztw76aM-18'
  },
  {
    id: 'nb:dropped-d:04',
    badge: 'Notebook 口语 · 美音连读',
    title: 'Dropped D: second time & second-hand',
    text: 'This is my second time visiting this city, and I love browsing local markets. I often buy second-hand books because they are still in great condition.',
    subtext: '高频口语：second time / second-hand（二手）/ in great condition（品相很好），second 后接辅音省读 D',
    sourceUrl: 'https://www.youtube.com/watch?v=cztw76aM-18'
  },
  // 2. Everyday Fluency Spoken Collocations
  {
    id: 'nb:fluency:01',
    badge: 'Notebook 口语 · 日常高频',
    title: 'insignificant amount & casual conversation',
    text: 'Do not stress over an insignificant amount of delay. When we have casual conversations with friends, sounding relaxed matters much more than using fancy words.',
    subtext: '实用搭配：an insignificant amount（微不足道的量）/ casual conversation（日常闲聊）/ fancy words（花哨词汇）',
    sourceUrl: 'https://www.youtube.com/watch?v=7P-R0Z5zXig'
  },
  {
    id: 'nb:fluency:02',
    badge: 'Notebook 口语 · 日常高频',
    title: 'breathe deeply & take a deep breath',
    text: 'Whenever you feel nervous before an interview or a demo class, pause for two seconds, take a deep breath, and breathe deeply before you start speaking.',
    subtext: '区分动词 breathe（/briːð/）与名词 breath（/breθ/）：面试或试讲紧张前先深呼吸',
    sourceUrl: 'https://www.youtube.com/watch?v=7P-R0Z5zXig'
  },
  // 3. Grad / Gress Etymology in Spoken Sentences
  {
    id: 'nb:etymology:01',
    badge: 'Notebook 口语 · 词根造句',
    title: 'progress vs. regress (-gress- = to step)',
    text: 'Even slow progress is still a step forward. You only regress when you stop showing up and let small habits slip away.',
    subtext: 'pro-（向前）+ -gress-（走）= progress 进步；re-（向后）+ -gress- = regress 退步；show up 坚持到场',
    sourceUrl: ''
  },
  {
    id: 'nb:etymology:02',
    badge: 'Notebook 口语 · 词根造句',
    title: 'aggressive & transgress in context',
    text: 'Setting an overly aggressive schedule often backfires. Instead of pushing so hard that you burn out, build a steady rhythm you can actually maintain.',
    subtext: 'aggressive schedule（过于激进的计划）/ backfire（适得其反）/ burn out（精疲力竭）',
    sourceUrl: ''
  },
  // 4. Long Natural Spoken Dialogue (Multi-Turn Everyday Fluency)
  {
    id: 'nb:dialogue:01',
    badge: 'Notebook 长对话 · 1/5',
    title: 'Long Dialogue: Keeping Momentum (Part 1)',
    text: 'Alex: Hey, you look way more energized today. Did something good happen? Sam: Honestly, nothing huge—I just decided to stop overthinking my whole plan and focus on one small win each morning.',
    subtext: '长对话磨耳朵（保持节奏）：look energized（看起来精力充沛）/ stop overthinking（别再过度内耗）/ one small win',
    sourceUrl: ''
  },
  {
    id: 'nb:dialogue:02',
    badge: 'Notebook 长对话 · 2/5',
    title: 'Long Dialogue: Keeping Momentum (Part 2)',
    text: 'Alex: That actually makes a lot of sense. Whenever I try to overhaul my entire routine overnight, I stick with it for three days and then completely fall off.',
    subtext: '地道口语：overhaul my routine（彻底大改作息）/ stick with it（坚持下去）/ fall off（半途而废）',
    sourceUrl: ''
  },
  {
    id: 'nb:dialogue:03',
    badge: 'Notebook 长对话 · 3/5',
    title: 'Long Dialogue: Keeping Momentum (Part 3)',
    text: 'Sam: Exactly. I realized that consistency beats intensity every single time. Even twenty minutes of focused listening while walking adds up faster than you think.',
    subtext: '金句口语：consistency beats intensity（持续胜过猛冲）/ adds up faster than you think（积少成多比你想象的快）',
    sourceUrl: ''
  },
  {
    id: 'nb:dialogue:04',
    badge: 'Notebook 长对话 · 4/5',
    title: 'Long Dialogue: Keeping Momentum (Part 4)',
    text: 'Alex: How do you deal with those days when you feel completely drained and just want to scroll on your phone? Sam: I give myself permission to scale it down—just five minutes counts, as long as I do not break the chain.',
    subtext: '地道表达：feel completely drained（彻底电量耗尽）/ scale it down（降量保底）/ do not break the chain（不断链）',
    sourceUrl: ''
  },
  {
    id: 'nb:dialogue:05',
    badge: 'Notebook 长对话 · 5/5',
    title: 'Long Dialogue: Keeping Momentum (Part 5)',
    text: 'Alex: I love that mindset. Keep the bar low enough to start, and high enough to grow. Sam: Right? Show up every day, follow through on the basics, and sooner or later you will catch a break.',
    subtext: '收尾金句：keep the bar low enough to start（门槛低到能启动）/ follow through（坚持到底）/ catch a break（迎来转机）',
    sourceUrl: ''
  },
  // 5. IELTS Speaking Band 8+ Framing & Natural Discourse Connectors
  {
    id: 'nb:ielts:01',
    badge: 'Notebook 口语 · IELTS 高分表达',
    title: 'Framing a Balanced View (On the one hand...)',
    text: 'To be completely honest, I see both sides of the issue. On the one hand, digital tools save a tremendous amount of time; on the other hand, relying on them blindly can dull our independent thinking.',
    subtext: 'IELTS Part 3 黄金辩证句型：see both sides / tremendous amount of time / dull independent thinking',
    sourceUrl: ''
  },
  {
    id: 'nb:ielts:02',
    badge: 'Notebook 口语 · IELTS 高分表达',
    title: 'Buying Time Naturally Without Saying "Um"',
    text: 'That is a fascinating question—I have never actually put it into words before, but if I had to narrow it down, I would say consistency matters far more than raw talent.',
    subtext: '地道思考缓冲：put it into words（用语言表达）/ narrow it down（缩小范围概括）/ raw talent（纯粹天赋）',
    sourceUrl: ''
  },
  {
    id: 'nb:ielts:03',
    badge: 'Notebook 口语 · IELTS 高分表达',
    title: 'Giving Concrete Personal Examples',
    text: 'A classic example from my own routine is learning English during my commute. Instead of scrolling aimlessly, listening to a five-minute speech turns dead time into steady progress.',
    subtext: '自然举例模板：a classic example from my own routine / scrolling aimlessly / turn dead time into steady progress',
    sourceUrl: ''
  },
  {
    id: 'nb:ielts:04',
    badge: 'Notebook 口语 · IELTS 高分表达',
    title: 'Speculating About Future Trends',
    text: 'Looking ahead over the next decade, I reckon personalized learning will become the norm rather than the exception, especially as voice technology becomes more responsive and affordable.',
    subtext: '预测趋势表达：looking ahead / I reckon（我认为）/ become the norm rather than the exception（成为常态而非特例）',
    sourceUrl: ''
  },
  // 6. ESL Classroom & Demo Teaching Natural Instructions
  {
    id: 'nb:demo:01',
    badge: 'Notebook 口语 · 试讲课堂用语',
    title: 'Warm Classroom Opening & Check-In',
    text: 'Good morning, everyone! Before we dive into today story, take thirty seconds to turn to your partner and share one small win from your week. Ready? Go for it!',
    subtext: '试讲开场破冰：dive into（进入主题）/ turn to your partner（和同桌交流）/ Go for it!',
    sourceUrl: ''
  },
  {
    id: 'nb:demo:02',
    badge: 'Notebook 口语 · 试讲课堂用语',
    title: 'Eliciting Answers & Positive Scaffolding',
    text: 'You are right on track! Let us stretch that idea one step further—can you give us a quick example using the word we just spotted in paragraph two?',
    subtext: '启发式互动与支架引导：right on track（思路很对）/ stretch that idea（把想法展开）/ spotted（发现）',
    sourceUrl: ''
  },
  {
    id: 'nb:demo:03',
    badge: 'Notebook 口语 · 试讲课堂用语',
    title: 'Gentle Pronunciation & Connected-Speech Coaching',
    text: 'Great effort! Notice how the D sound softens when we say friend was quickly. Let us try it together at a relaxed pace: my friend was here. Much smoother!',
    subtext: '温和纠音示范：softens（弱化）/ at a relaxed pace（用轻松的语速）/ Much smoother!',
    sourceUrl: ''
  },
  {
    id: 'nb:demo:04',
    badge: 'Notebook 口语 · 试讲课堂用语',
    title: 'Clean Lesson Wrap-Up & Takeaway',
    text: 'Before we wrap up, let us do a quick thirty-second recap. What is one phrase from today class that you can actually use in real life tonight?',
    subtext: '课堂收尾复盘：wrap up（收尾）/ quick recap（快速复盘）/ actually use in real life',
    sourceUrl: ''
  }
,
  {
    id: "nb:phonics:01",
    badge: "自然拼读 · Phonics",
    title: "Short vs. Long Vowels & The Magic E Rule",
    text: "Let's start with the foundation of English phonics: short vowels versus long vowels with Magic E. A short vowel says its quick sound inside a closed syllable: cap, hat, bit, hop, tub, pet. Now add a silent E at the end, and that E reaches back to make the vowel say its own alphabet name: cap becomes cape, hat becomes hate, bit becomes bite, hop becomes hope, tub becomes tube, and pet becomes Pete. Practice the rhythm aloud: tap, tape; plan, plane; rid, ride; not, note; cut, cute. Hearing that crisp contrast unlocks thousands of everyday English words.",
    subtext: "自然拼读核心规律：闭音节短元音 vs. 结尾不发音 Magic E 变长元音（cap/cape, hop/hope）"
  },
  {
    id: "nb:phonics:02",
    badge: "自然拼读 · Phonics",
    title: "Vowel Teams: AI / AY and EE / EA",
    text: "When two vowels walk together, the first often does the talking. Look at the long A team: AI usually sits in the middle of a word—rain, train, paint, wait, explain—while AY loves the end of a word—day, stay, play, delay, always. Now compare the long E team: EE and EA. Practice EE in sleep, keep, green, speech, and agree. Practice EA in read, speak, clean, reach, and breathe. Watch out for a few common EA exceptions that sound short like E, such as bread, head, ready, and heavy. Saying these pairs in short phrases locks the spelling pattern into your ear.",
    subtext: "元音组合规律：ai（词中）/ ay（词尾）发长 A；ee / ea 发长 E（含 bread/ready 常见例外）"
  },
  {
    id: "nb:phonics:03",
    badge: "自然拼读 · Phonics",
    title: "Vowel Teams: OA / OW and IGH / IE",
    text: "Next, let's master the long O and long I vowel teams. OA sits in the middle of words like boat, coat, road, coach, goal, and approach. OW often ends a word with the same smooth long O sound: snow, grow, slow, glow, window, and tomorrow. For long I, listen to the three-letter team IGH, where the G and H stay completely silent: light, night, bright, sight, flight, and midnight. You also hear long I in IE at the end of short words like pie, tie, and lie, while IE in longer words like achieve, believe, and relief flips to a long E sound.",
    subtext: "长元音组合：oa / ow（boat, approach, tomorrow）与 igh / ie（bright, flight, achieve）"
  },
  {
    id: "nb:phonics:04",
    badge: "自然拼读 · Phonics",
    title: "Diphthongs: OI / OY, OU / OW, and AU / AW",
    text: "Diphthongs are gliding vowels where your mouth smoothly moves from one position to another. First, OI and OY make the same glide: OI inside words—voice, choice, point, join, avoid—and OY at the end—boy, joy, enjoy, toy, loyal. Second, OU and OW give you the crisp 'ow' glide: sound, round, house, cloud, shout, crowd, power, allow, and downtown. Third, AU and AW create an open 'aw' sound: pause, cause, launch, author, draw, saw, lawn, and awesome. Try reading one smooth sentence: 'Enjoy the loud applause as the author pauses to draw.'",
    subtext: "双元音滑音组合：oi/oy（voice/enjoy）、ou/ow（sound/crowd）、au/aw（pause/awesome）"
  },
  {
    id: "nb:phonics:05",
    badge: "自然拼读 · Phonics",
    title: "R-Controlled Vowels: AR, OR, and ER / IR / UR",
    text: "In English phonics, the letter R is called 'Bossy R' because it changes the vowel right in front of it. AR sounds bright and open: car, star, start, smart, sharp, market, and charge. OR gives a rounded back sound: for, storm, sport, morning, corner, and support. Here is the best shortcut in phonics: ER, IR, and UR all share the exact same smooth sound in American English! Listen closely: her, term, nerve, person; bird, first, firm, circle; turn, burn, nurse, purpose. Repeat them together: 'Her first purpose is to stay firm and calm.'",
    subtext: "R 控元音（Bossy R）：ar（start/charge）、or（storm/support）与 er/ir/ur 同音规律"
  },
  {
    id: "nb:phonics:06",
    badge: "自然拼读 · Phonics",
    title: "Consonant Digraphs: SH, CH, TH, PH, and WH",
    text: "A consonant digraph is two letters that team up to make one brand-new sound. SH makes a quiet rushing air sound: ship, sharp, shadow, finish, and fresh. CH starts with a tiny stop before the puff of air: check, chance, challenge, teach, and coach. TH has two versions—put your tongue gently between your teeth: voiceless TH in think, thank, path, and breath; voiced TH with throat vibration in this, that, breathe, smooth, and rhythm. Finally, PH sounds just like F in phone, photo, phrase, and phonics, while WH glides cleanly in what, where, while, and whisper.",
    subtext: "辅音字母组合：sh/ch 对比、清浊 th 咬舌发音（breath vs. breathe）、ph 与 wh"
  },
  {
    id: "nb:phonics:07",
    badge: "自然拼读 · Phonics",
    title: "Hard vs. Soft C and G: The E-I-Y Rule",
    text: "Why does C sound like K in 'cat' but like S in 'city'? And why does G sound hard in 'game' but soft like J in 'gentle'? One simple rule covers almost every case: when C or G is followed by E, I, or Y, it turns soft! Listen to hard C: cat, cold, cup, class, music. Now soft C before E, I, Y: center, city, circle, cycle, cancel, and success. Listen to hard G: game, goal, guide, great. Now soft G before E, I, Y: gentle, giant, gym, energy, manage, and stage. A few everyday words like get, give, and girl break the soft-G rule, so just keep those three in mind.",
    subtext: "软硬 C 与 G 的黄金法则：遇到 e/i/y 变软音（city/cycle/gentle/energy）"
  },
  {
    id: "nb:phonics:08",
    badge: "自然拼读 · Phonics",
    title: "Consonant Blends & Smooth Clusters",
    text: "Unlike digraphs, consonant blends keep every single letter's sound—you simply slide through them without inserting an extra 'uh' vowel in between. Practice L-blends: black, clean, clear, flow, glad, plan, slow. Practice R-blends: bright, crisp, drive, fresh, grow, practice, strong, trust. Practice S-blends and three-letter clusters: speak, skill, small, smart, start, stay, street, stretch, screen, spring, and splendid. A great tip for Chinese speakers: never add a hidden vowel after the first consonant—say 'blue,' not 'buh-lue'; say 'speak,' not 'suh-peak.'",
    subtext: "辅音连缀顺滑拼读：bl/cl/cr/str/spl 等不加多余元音，摆脱中式拖音"
  },
  {
    id: "nb:phonics:09",
    badge: "自然拼读 · Phonics",
    title: "Silent Letters You Meet Every Day",
    text: "English spelling preserves history, which leaves behind predictable silent-letter patterns. First, silent K before N: know, knee, knife, knock, knight, and knowledge. Second, silent W before R: write, wrong, wrap, wrist, and wreck. Third, silent B after M or before T: climb, comb, thumb, crumb, doubt, debt, and subtle. Fourth, silent L in calm, palm, walk, talk, half, and would. Fifth, silent G before N in sign, design, foreign, and campaign, plus silent H in hour, honest, honor, and rhythm. Grouping silent letters by pattern turns spelling traps into easy wins.",
    subtext: "高频不发音字母归类：kn（know）、wr（write）、mb/bt（climb/subtle）、gn（design）"
  },
  {
    id: "nb:phonics:10",
    badge: "自然拼读 · Phonics",
    title: "Breaking Long Words into Six Syllable Types",
    text: "When you see a long English word, never panic—just slice it into syllables. Every English syllable belongs to one of six types: Closed syllables end in a consonant with a short vowel, like 'rab-bit' or 'nap-kin.' Open syllables end in a vowel that says its long name, like 'ti-ger,' 'pa-per,' or 'mo-ment.' Magic-E syllables appear in 'com-plete' and 'in-side.' Vowel-team syllables show up in 'ex-plain' and 're-peat.' R-controlled syllables power 'mar-ket' and 'per-fect.' And Consonant-LE sits at the end of 'ta-ble,' 'sim-ple,' and 'han-dle.' Try slicing 're-spon-si-bil-i-ty' beat by beat—suddenly even six-syllable words feel effortless.",
    subtext: "长难词拆解术：掌握六大音节类型，像拼积木一样读出任意多音节词"
  },
  {
    id: "nb:phonics:11",
    badge: "自然拼读 · Phonics",
    title: "The Schwa Sound /ə/: Secret to Native Rhythm",
    text: "The single most common vowel sound in English is not A, E, I, O, or U—it is the lazy, relaxed Schwa sound, 'uh.' Any unstressed vowel in a multi-syllable word can relax into Schwa. Listen to the first syllable of about, ago, around, and support. Listen to the middle of family, memory, camera, and banana. Listen to the end of problem, system, focus, and campus. Even stressed vowels shift when stress moves: compare PHO-to-graph with pho-TOG-ra-phy! Relaxing your unstressed syllables into Schwa is what makes your English flow like music instead of sounding robotic.",
    subtext: "美音节奏核心：弱读央元音 Schwa（/ə/），让多音节词听起来自然松弛不生硬"
  },
  {
    id: "nb:phonics:12",
    badge: "自然拼读 · Phonics",
    title: "Mastering -ED Past Tense Endings: /t/, /d/, /ɪd/",
    text: "Many learners accidentally add an extra syllable to every past-tense verb, saying 'work-ed' instead of 'workt.' Here is the complete three-way rule for -ED endings. Only add an extra syllable '/ɪd/' when the base verb ends in a T or D sound: wanted, needed, decided, started, ended. If the verb ends in a voiceless sound like P, K, F, S, SH, or CH, the -ED sounds like a crisp /t/: stopped, worked, laughed, missed, finished, watched. For all other voiced endings—vowels, L, M, N, R, V, Z—the -ED sounds like a gentle /d/: played, called, planned, loved, and realized.",
    subtext: "过去式 -ed 结尾三大发音法则：仅 t/d 后加音节，清辅音后读 /t/，浊音后读 /d/"
  },
  {
    id: "nb:phonics:13",
    badge: "自然拼读 · Phonics",
    title: "Plural & Third-Person -S / -ES Endings",
    text: "Just like -ED, the -S ending follows your vocal cords. After voiceless consonants P, T, K, F, and TH, pronounce a clean /s/: cups, cats, books, laughs, months, works, keeps. After voiced sounds—all vowels plus B, D, G, L, M, N, R, V—your throat stays buzzing for /z/: bags, dogs, calls, runs, loves, days, plays, movies. Finally, after hissing or buzzing sounds S, Z, SH, CH, X, and soft G, add an extra syllable '/ɪz/': buses, glasses, washes, watches, boxes, changes, and pages. Mastering these endings makes your spoken grammar sound instantly sharper.",
    subtext: "复数与三单 -s/-es 发音规律：清音读 /s/、浊音读 /z/、嘶嘶音后加音节读 /ɪz/"
  },
  {
    id: "nb:phonics:14",
    badge: "自然拼读 · Phonics",
    title: "Word Stress Shifts: Noun vs. Verb Pairs",
    text: "In English, moving the stress from the first syllable to the second can change a noun into a verb! Listen carefully to these high-frequency pairs. Noun on the first syllable, verb on the second: a RE-cord versus to re-CORD; a PRE-sent versus to pre-SENT; PRO-gress versus to pro-GRESS; a PRO-ject versus to pro-JECT; CON-tent versus to con-TENT; an OB-ject versus to ob-JECT; a PER-mit versus to per-MIT; and IN-crease versus to in-CREASE. Try a quick drill: 'We need to re-CORD our daily PRO-gress and pre-SENT the final PRO-ject.'",
    subtext: "重音改变词性：名词重音在前、动词重音在后（REcord/reCORD, PREsent/preSENT）"
  },
  {
    id: "nb:phonics:15",
    badge: "自然拼读 · Phonics",
    title: "High-Value Minimal Pairs for Crystal-Clear Speech",
    text: "Let's sharpen five minimal-pair contrasts that make the biggest difference in clarity. First, tense long E versus relaxed short I: sheep and ship, leave and live, feel and fill, seat and sit. Second, open wide A versus mid E: bad and bed, man and men, pan and pen, flash and flesh. Third, tongue-between-teeth TH versus S: think and sink, thank and sank, mouth and mouse. Fourth, teeth-on-lip V versus rounded-lips W: vine and wine, very and wary, vest and west. Fifth, tongue-tip L versus curled-back R: light and right, glass and grass, collect and correct.",
    subtext: "五大核心最小对立词辩音：sheep/ship, bad/bed, think/sink, very/wary, light/right"
  },
  {
    id: "nb:phonics:16",
    badge: "自然拼读 · Phonics",
    title: "American Flap T & Glottal T in Real Speech",
    text: "Why does 'water' sound like 'wadder' and 'better' sound like 'bedder' in everyday American speech? When a T sits between two vowels and the second syllable is unstressed, your tongue makes one quick tap on the ridge behind your top teeth—that's the Flap T. Practice it in water, better, city, little, meeting, computer, and 'get it' or 'put it on.' On the other hand, when T comes right before an unstressed N—like mountain, button, certain, written, and important—many Americans hold the breath briefly in the throat as a smooth glottal stop. Recognizing both makes fast native speech suddenly clear.",
    subtext: "美音地道秘诀：元音间闪音 T（water/better/get it）与 n 前喉塞音（mountain/important）"
  },
  {
    id: "nb:phonics:17",
    badge: "自然拼读 · Phonics",
    title: "Linking: Consonant-to-Vowel & Glide Intrusion",
    text: "Native speakers do not pause between every word; they connect words into smooth breath groups. Whenever a word ends in a consonant and the next starts with a vowel, carry the consonant straight across: 'check it out' sounds like 'che-ki-tout'; 'pick up' sounds like 'pi-kup'; 'turn it off' sounds like 'tur-ni-toff'; 'hold on a second' flows like 'hol-do-na second.' When two vowels meet, add a tiny natural glide: after an E or I sound, glide with a soft Y—'see it,' 'be on time,' 'the other'; after an O or U sound, glide with a soft W—'go on,' 'do it,' 'too early.'",
    subtext: "自然连读两大核心：辅元连读（check it out / turn it off）与元元加音滑音（see it / go on）"
  },
  {
    id: "nb:phonics:18",
    badge: "自然拼读 · Phonics",
    title: "Everyday Spoken Reductions & Weak Forms",
    text: "In casual spoken English, helper words shrink so the key meaning words stand out. Listen to these super common reductions: 'going to' relaxes into 'gonna'—'I'm gonna grab some coffee.' 'Want to' becomes 'wanna'—'Do you wanna head out now?' 'Kind of' and 'sort of' soften into 'kinda' and 'sorta.' 'Did you' blends into 'didja'—'Didja get my message?' 'Could have' and 'should have' shorten to 'could've' and 'should've.' Remember: you don't have to force slang in formal talks, yet training your ears on these reductions makes movies, podcasts, and real conversations ten times easier to follow.",
    subtext: "日常口语弱读与缩读：gonna, wanna, kinda, didja, could’ve——听懂原生语速的关键"
  },
  {
    id: "nb:daily:01",
    badge: "每日小口语 · Daily Spoken",
    title: "Morning Routine & Getting into the Groove",
    text: "Let's practice natural morning small talk. 'I'm honestly not a morning person—I hit the snooze button twice today.' 'Same here, I don't really wake up until I've had my first cup of coffee.' 'Once I get moving, though, I usually get into the groove pretty fast.' 'What's your plan for kicking off the day?' 'I'm gonna knock out my English listening first while my head is still fresh, then dive into work.' Short, punchy, and completely natural.",
    subtext: "早晨高频小口语：hit the snooze button（按贪睡键）、get into the groove（进入状态）"
  },
  {
    id: "nb:daily:02",
    badge: "每日小口语 · Daily Spoken",
    title: "Ordering Coffee & Café Chat",
    text: "Here's how to sound effortless at any coffee shop. 'Hi there, could I get a medium iced oat latte with less ice?' 'Sure thing—is that for here or to go?' 'To go, please. Oh, and could I also grab a blueberry muffin?' 'Want me to warm that up for you?' 'Yes, please, that'd be awesome.' 'Alright, your total comes to nine fifty.' 'Here you go—keep the change.' 'Thanks a ton, your drink will be right up at the counter.'",
    subtext: "咖啡馆地道点单：for here or to go（堂食还是带走）、warm that up（加热一下）"
  },
  {
    id: "nb:daily:03",
    badge: "每日小口语 · Daily Spoken",
    title: "Commuting, Subway & Asking Directions",
    text: "Useful phrases for getting around the city. 'The subway was packed like sardines this morning, so I almost missed my stop.' 'Ugh, rush hour is brutal. Did you end up catching the express train?' 'Yeah, thankfully it saved me ten minutes.' Now for asking directions: 'Excuse me, do you happen to know the quickest way to the library?' 'Yeah, just go straight down this block, take a left at the traffic light, and it's right around the corner—you can't miss it.'",
    subtext: "通勤与问路口语：packed like sardines（挤成沙丁鱼）、you can’t miss it（一眼就能看到）"
  },
  {
    id: "nb:daily:04",
    badge: "每日小口语 · Daily Spoken",
    title: "Weather & Effortless Icebreakers",
    text: "Great conversations often start with a light two-line opener. 'Hey! How's your week treating you so far?' 'Pretty good, can't complain—just keeping busy. How about you?' 'Not bad at all! Though it's super muggy outside today, right?' 'Tell me about it—I walked five minutes and felt like I'd been to the gym.' 'At least the forecast says it's supposed to clear up by the weekend.' Notice how 'can't complain' and 'tell me about it' instantly sound warm and native.",
    subtext: "自然破冰开场白：How’s your week treating you? / Can’t complain / Tell me about it（可不是嘛）"
  },
  {
    id: "nb:daily:05",
    badge: "每日小口语 · Daily Spoken",
    title: "Polite Requests & Asking for Favors",
    text: "Instead of a stiff 'Give me' or 'Help me,' try these smooth everyday requests. 'Hey, could you do me a quick favor?' 'Of course, what's up?' 'Would you mind keeping an eye on my bag for a second while I grab some water?' 'Not at all, go right ahead.' Or at work: 'Whenever you get a chance, could you take a quick look at this draft? No rush at all—sometime this afternoon is totally fine.' 'Sure thing, I'll send you my notes right after lunch.'",
    subtext: "礼貌求助表达：keep an eye on（照看一下）、Whenever you get a chance / No rush at all"
  },
  {
    id: "nb:daily:06",
    badge: "每日小口语 · Daily Spoken",
    title: "Saying Yes, No, and Maybe Like a Native",
    text: "Let's upgrade plain 'yes,' 'no,' and 'maybe.' Enthusiastic yes: 'I'm totally down!' 'Count me in!' 'Sounds like a plan.' Polite, warm no: 'I'd love to, but I'll have to take a rain check—my schedule is packed tonight.' 'I'm gonna have to pass this time, maybe next week?' Flexible maybe: 'Let me play it by ear and text you around five.' 'I'm on the fence right now, let me sleep on it and get back to you tomorrow.'",
    subtext: "地道回应邀请：I’m totally down / take a rain check（改天约）/ play it by ear（见机行事）"
  },
  {
    id: "nb:daily:07",
    badge: "每日小口语 · Daily Spoken",
    title: "Agreeing & Disagreeing Smoothly",
    text: "In real discussions, tone matters as much as grammar. Strong agreement: 'You took the words right out of my mouth.' 'Couldn't agree more.' 'That hits the nail on the head.' Respectful disagreement: 'I see where you're coming from, though I look at it a bit differently.' 'Fair point—on the other hand, we might run out of time if we do it that way.' 'I'm with you on the first part, I'm just not sold on the timeline yet.'",
    subtext: "赞同与委婉反对：took the words right out of my mouth / Fair point, though... / not sold on"
  },
  {
    id: "nb:daily:08",
    badge: "每日小口语 · Daily Spoken",
    title: "Dining Out & Splitting the Bill",
    text: "Essential restaurant micro-dialogues. 'I'm starving—what do you recommend here?' 'Their spicy beef noodles are out of this world, and the portions are huge.' 'Awesome, let's get an order of those and share a plate of dumplings.' Halfway through: 'Everything tastes amazing—could we get a refill on water when you have a moment?' At the end: 'Could we grab the check, please?' 'No, put your card away—this one's on me.' 'Are you sure? Let's at least split it down the middle!'",
    subtext: "餐厅高频口语：out of this world（好吃到起飞）、this one’s on me（我请客）、split it down the middle（AA）"
  },
  {
    id: "nb:daily:09",
    badge: "每日小口语 · Daily Spoken",
    title: "Shopping, Trying On & Returns",
    text: "Everyday shopping lines that feel relaxed and polite. 'Hi, let me know if you need help finding anything.' 'Thanks, I'm just browsing for now.' Later: 'Excuse me, do you happen to carry this jacket in a medium?' 'Let me check in the back for you—looks like we have one left!' 'Nice! And it's thirty percent off? That's a steal.' 'Just in case, what's your return policy?' 'You've got thirty days with the receipt for a full refund or exchange.'",
    subtext: "购物实用小口语：just browsing（随便看看）、That’s a steal（太划算了）、return policy"
  },
  {
    id: "nb:daily:10",
    badge: "每日小口语 · Daily Spoken",
    title: "Phone Calls, Voice Notes & Texting",
    text: "Natural phrases for phone and messaging life. 'Hey, sorry I missed your call—I was in the middle of something.' 'No worries at all! Wait, you're breaking up a little—can you hear me now?' 'Much better, I just stepped out of the elevator.' Ending a quick call: 'Let me double-check my calendar and get back to you in ten minutes.' 'Sounds good, just shoot me a text or drop me a quick voice note whenever you're ready.'",
    subtext: "电话与发消息口语：you’re breaking up（信号断断续续）、shoot me a text（发我条短信）"
  },
  {
    id: "nb:daily:11",
    badge: "每日小口语 · Daily Spoken",
    title: "Making Plans & Rescheduling Gracefully",
    text: "Plans change all the time, so keep these ready. 'Are you free sometime this weekend to grab dinner?' 'Saturday evening works great for me—how does seven sound?' When something shifts: 'Hey, super sorry, something just came up at work. Any chance we could push it back by half an hour?' 'Totally fine, seven thirty actually works even better for me. Take your time and let me know when you're on your way.'",
    subtext: "约时间与改期口语：something came up（临时有事）、push it back by half an hour（推迟半小时）"
  },
  {
    id: "nb:daily:12",
    badge: "每日小口语 · Daily Spoken",
    title: "Fitness, Energy & Rest Check-Ins",
    text: "Talking about workouts, energy, and taking care of yourself. 'I'm pretty sore from yesterday's workout, so I'm just doing a light walk today to get my steps in.' 'Good call—listening to your body is half the battle.' 'Honestly, I'm completely wiped out after this week.' 'Same, I'm calling it an early night and getting a solid eight hours of sleep. A little rest goes a long way.'",
    subtext: "运动与精力状态：get my steps in（凑步数）、wiped out（累瘫了）、calling it an early night（早点睡）"
  },
  {
    id: "nb:daily:13",
    badge: "每日小口语 · Daily Spoken",
    title: "Work, Deep Focus & Wrapping Up",
    text: "Clean everyday English for work and study sessions. 'I've been swamped with deadlines all week, so I'm putting my phone on Do Not Disturb for the next hour.' 'Smart move—once you're deep in the zone, you get twice as much done.' 'Mind if we take a quick five-minute breather before we tackle the next section?' 'Let's do it. After that, we'll wrap things up and call it a day.'",
    subtext: "工作与专注学习口语：swamped with（忙得不可开交）、in the zone（心流状态）、call it a day（收工）"
  },
  {
    id: "nb:daily:14",
    badge: "每日小口语 · Daily Spoken",
    title: "English Teaching & Classroom Micro-Phrases",
    text: "Warm, clear classroom English that makes students feel confident. 'Don't worry if it looks tricky at first—let's break it down piece by piece.' 'Go ahead and take a wild guess; mistakes are how we learn.' 'Ooh, you're super close—you're definitely on the right track!' 'Notice how your mouth glides on that vowel? Let's run through that sentence one more time, nice and smooth.' 'Awesome job—you just nailed the exact rhythm.'",
    subtext: "英语教学高频互动句：break it down / take a wild guess / on the right track / run through it"
  },
  {
    id: "nb:daily:15",
    badge: "每日小口语 · Daily Spoken",
    title: "Giving Genuine Compliments & Reacting Naturally",
    text: "Giving and receiving praise without feeling stiff. 'Whoa, you totally nailed that presentation—your pacing was spot on.' 'You're too kind, thanks! I was honestly super nervous at the start.' 'Could've fooled me—you looked completely calm up there.' 'I really appreciate you saying that, it means a lot.' Or about a useful tip: 'That trick you showed me is a total game changer—it saved me so much time.'",
    subtext: "夸人与回应夸奖：spot on（恰到好处）、Could’ve fooled me（完全看不出）、game changer"
  },
  {
    id: "nb:daily:16",
    badge: "每日小口语 · Daily Spoken",
    title: "Expressing Relief, Surprise & Real Empathy",
    text: "Short emotional reactions that bring life to your speaking. Relief: 'Phew, what a relief! I thought I'd lost my keys for good.' 'Thank goodness that worked out.' Surprise: 'No way, you're kidding! That's wild!' Empathy: 'Oh man, that must have been really rough. I'm sorry you had to deal with that.' 'Hang in there—if you ever need to vent or bounce ideas around, I'm just a text away.'",
    subtext: "情绪反应小口语：what a relief（松了口气）、That’s wild（太不可思议）、Hang in there（撑住）"
  },
  {
    id: "nb:daily:17",
    badge: "每日小口语 · Daily Spoken",
    title: "Apologizing & Recovering Smoothly",
    text: "How to own a small slip-up calmly and move on. 'Oh, my bad—I totally spaced on sending you that link!' 'No harm done, I didn't need it until tomorrow anyway.' 'Still, thanks for bearing with me.' In a more professional moment: 'I apologize for the mix-up—let me fix that right away and make sure it doesn't happen again.' 'Appreciate the quick heads-up, we're all good.'",
    subtext: "道歉与化解尴尬：my bad / totally spaced on（完全忘光了）/ bearing with me / no harm done"
  },
  {
    id: "nb:daily:18",
    badge: "每日小口语 · Daily Spoken",
    title: "Asking for Clarification Without Feeling Awkward",
    text: "Even native speakers ask people to repeat things—here's how to do it effortlessly. 'Sorry, I didn't quite catch that last part—could you say it one more time?' 'Wait, run that by me again? You're saying we meet at eight, not nine?' 'Just to make sure we're on the same page, you want the summary first, right?' 'In other words, keep it short and punchy—got it!'",
    subtext: "没听清时自然追问：didn’t quite catch that / run that by me again / on the same page"
  },
  {
    id: "nb:daily:19",
    badge: "每日小口语 · Daily Spoken",
    title: "Travel, Airport & Hotel Check-In",
    text: "Smooth travel phrases for airports and hotels. 'Good morning, I'd like to check in for my flight—any chance I could get a window seat?' 'Sure, you're all set in 14A, and boarding starts at ten fifteen.' At the hotel: 'Hi, I have a reservation under Wang. I know I'm a bit early—is there any chance my room is ready?' 'Let me check—yes, we can get you an early check-in, and breakfast is included from seven to ten.'",
    subtext: "出行与酒店办理入住：window seat / you’re all set / early check-in / is breakfast included?"
  },
  {
    id: "nb:daily:20",
    badge: "每日小口语 · Daily Spoken",
    title: "Tech Glitches & Everyday Hiccups",
    text: "Real-world phrases when gadgets misbehave. 'Ugh, the Wi-Fi is acting up again—the page won't load.' 'Have you tried turning it off and back on, or switching to mobile data?' 'Yeah, that did the trick! Oh wait, my phone battery is about to die—do you happen to have a charger I could borrow for ten minutes?' 'Sure, plug it in right here—it's a fast charger.'",
    subtext: "日常设备小故障：acting up（抽风/闹脾气）、that did the trick（搞定了）、about to die（快没电了）"
  },
  {
    id: "nb:daily:21",
    badge: "每日小口语 · Daily Spoken",
    title: "Weekend Plans & Recharging",
    text: "Casual Friday-afternoon and weekend chat. 'Got any fun plans for the weekend?' 'Nothing too crazy—I'm mostly just taking it easy, catching up on sleep, and maybe binge-watching a new series.' 'Honestly, a low-key weekend sounds heavenly right now.' 'Yeah, I really need to unplug a bit and recharge my batteries before Monday rolls around.'",
    subtext: "周末放松口语：taking it easy / low-key weekend（清静周末）/ recharge my batteries（充电）"
  },
  {
    id: "nb:daily:22",
    badge: "每日小口语 · Daily Spoken",
    title: "Encouraging Yourself or a Friend Who Feels Stuck",
    text: "Warm, grounded encouragement when things feel heavy. 'Hey, don't be so hard on yourself—you've already come a long way.' 'I know, I just feel like I'm moving too slowly.' 'Progress over perfection, remember? Just take it one step at a time and focus on what you can control today.' 'Thanks, I needed to hear that.' 'You've got this—and even small wins add up faster than you think.'",
    subtext: "鼓励自己与朋友：don’t be so hard on yourself / progress over perfection / You’ve got this"
  },
  {
    id: "nb:daily:23",
    badge: "每日小口语 · Daily Spoken",
    title: "Natural Transitions & Storytelling Connectors",
    text: "These tiny phrases glue your stories together smoothly. 'Speaking of which, did you ever hear back about that interview?' 'Yeah! Long story short, they loved the demo lesson and invited me to the final round.' 'No way! And here's the funny part—I almost overslept that morning. To make matters worse, it started pouring rain right as I stepped outside. At the end of the day, though, everything fell into place.'",
    subtext: "地道叙事衔接词：Speaking of which（说到这个）、Long story short（长话短说）、fell into place"
  },
  {
    id: "nb:daily:24",
    badge: "每日小口语 · Daily Spoken",
    title: "Wrapping Up a Conversation Warmly",
    text: "Ending a chat cleanly without an awkward pause. 'Well, I should probably let you go—I know you've got a busy evening.' 'It was so great catching up with you! We really shouldn't be strangers.' 'Definitely—let's grab coffee again sometime next month.' 'For sure! Get home safe, take care, and talk soon.' 'You too, bye!'",
    subtext: "温暖体面收尾：I should let you go / great catching up / let’s not be strangers（常联系）"
  }
]);

/**
 * Computes a natural shadowing pause duration (ms) proportional to English text length
 * so the learner has time to repeat aloud hands-free while wearing AirPods.
 */
export function computeShadowPauseMs(text = '', { enabled = false, baseMs = 1500, msPerWord = 360, maxMs = 8000 } = {}) {
  if (!enabled) return 900;
  const words = (cleanRad(text).match(/\b[A-Za-z][A-Za-z'-]*\b/g) || []).length;
  return Math.min(maxMs, Math.max(baseMs, baseMs + words * msPerWord));
}

/**
 * Computes a safe watchdog timeout (ms) for any audio or Web Speech segment
 * so iOS Safari can never stall indefinitely if `onended` / `onend` is dropped.
 */
export function computeSegmentWatchdogMs(text = '', rate = 0.9) {
  const words = (cleanRad(text).match(/\b[A-Za-z][A-Za-z'-]*\b/g) || []).length;
  const safeRate = Math.max(0.5, Math.min(1.5, Number(rate) || 0.9));
  const estimatedMs = Math.round((words * 650) / safeRate);
  const ceiling = words > 120 ? 600000 : 45000;
  return Math.min(ceiling, Math.max(12000, estimatedMs + 8000));
}

/**
 * Builds a deterministic, deduplicated playlist of playable audio tracks.
 * Each track carries `segments` matching the exact unit strings hashed by
 * `audio-tasks.mjs` (`target`, `example`, sentence text) so offline Kokoro
 * `af_heart` MP3 clips match with 100% precision, while YouTube & Notebook
 * tracks stream smoothly via Gemini TTS.
 */
export function buildRadioPlaylist({
  channel = 'youtube_speeches',
  scope = 'all',
  activePackId = '',
  shuffle = false,
  items = [],
  vocabularyPractice = [],
  vocabularyAttempts = [],
  speeches = [],
  customYoutubeTracks = [],
  customNotebookTracks = []
} = {}) {
  const tracks = [];
  const seenText = new Set();

  const pushTrack = (track) => {
    const rawSegments = Array.isArray(track.segments) ? track.segments.map(cleanRad).filter(Boolean) : [];
    const text = cleanRad(track.text || rawSegments.join('. '));
    const segments = rawSegments.length ? rawSegments : (text ? [text] : []);
    if (!text || text.length < 2 || !segments.length) return;
    const key = text.toLocaleLowerCase('en');
    if (seenText.has(key)) return;
    seenText.add(key);
    tracks.push({
      id: track.id || `radio:${tracks.length + 1}`,
      kind: track.kind || 'word',
      badge: track.badge || '词条',
      title: cleanRad(track.title) || segments[0].slice(0, 48),
      text,
      segments,
      subtext: cleanRad(track.subtext || ''),
      audioUrl: cleanRad(track.audioUrl || ''),
      sourceUrl: cleanRad(track.sourceUrl || ''),
      priority: Number(track.priority || 10),
      exposureOnly: true
    });
  };

  // Channel: YouTube Motivational Speeches (built-in + optional custom/imported speeches)
  if (channel === 'youtube_speeches') {
    const ytList = [...BUILT_IN_YOUTUBE_SPEECHES, ...(Array.isArray(customYoutubeTracks) ? customYoutubeTracks : [])];
    ytList.forEach((entry, idx) => {
      pushTrack({
        id: entry.id || `radio:yt:${idx + 1}`,
        kind: 'youtube_speech',
        badge: entry.badge || 'YouTube 励志演讲',
        title: entry.title || `Speech Segment ${idx + 1}`,
        text: entry.text,
        segments: [entry.text],
        subtext: entry.subtext || '',
        sourceUrl: entry.sourceUrl || '',
        priority: idx + 1
      });
    });
    if (shuffle) {
      for (let i = tracks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tracks[i], tracks[j]] = [tracks[j], tracks[i]];
      }
    }
    return tracks;
  }

  // Channel: Notebook Spoken Phrases & Long Dialogues (built-in + optional custom tracks)
  if (channel === 'notebook_spoken') {
    const nbList = [...BUILT_IN_NOTEBOOK_SPOKEN, ...(Array.isArray(customNotebookTracks) ? customNotebookTracks : [])];
    nbList.forEach((entry, idx) => {
      pushTrack({
        id: entry.id || `radio:nb:${idx + 1}`,
        kind: 'notebook_spoken',
        badge: entry.badge || 'Notebook 口语',
        title: entry.title || `Spoken Clip ${idx + 1}`,
        text: entry.text,
        segments: [entry.text],
        subtext: entry.subtext || '',
        sourceUrl: entry.sourceUrl || '',
        priority: idx + 1
      });
    });
    if (shuffle) {
      for (let i = tracks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tracks[i], tracks[j]] = [tracks[j], tracks[i]];
      }
    }
    return tracks;
  }

  const inScope = row => {
    if (scope !== 'today' || !activePackId) return true;
    return cleanRad(row?.packId || row?.source?.id) === cleanRad(activePackId);
  };

  const missedVocabIds = new Set(
    (Array.isArray(vocabularyAttempts) ? vocabularyAttempts : [])
      .filter(a => a && !a.skipped && (a.firstCheck ? !a.firstCheck.correct : a.correct === false))
      .map(a => cleanRad(a.taskId || a.id))
  );

  // 1. Vocabulary practice tracks (split into exact [target, example] segments for Kokoro MP3 hits)
  if (channel !== 'sentences_listening') {
    for (const v of (Array.isArray(vocabularyPractice) ? vocabularyPractice : [])) {
      if (!inScope(v)) continue;
      const isMissed = missedVocabIds.has(cleanRad(v?.id));
      if (channel === 'weak_sniper' && !isMissed) continue;
      const head = cleanRad(v?.target);
      const ex = cleanRad(v?.archivedExample);
      const segments = [head, ex].filter(Boolean);
      if (segments.length) {
        pushTrack({
          id: `radio:vocab:${v.id}`,
          kind: 'vocab',
          badge: isMissed ? '今日错词' : '今日词汇',
          title: head || 'Vocabulary',
          text: segments.join(' — '),
          segments,
          subtext: cleanRad(v?.targetSense || ''),
          audioUrl: cleanRad(v?.audioUrl || ''),
          priority: isMissed ? 1 : 5
        });
      }
    }
  }

  // 2. Card items (words, sentences, listening)
  for (const item of (Array.isArray(items) ? items : [])) {
    if (!item || item.archived || item.paused || !inScope(item)) continue;
    const isWeak = item.status === 'N' || item.status === 'V';
    if (channel === 'weak_sniper' && !isWeak) continue;
    if (channel === 'sentences_listening' && item.kind !== 'sentence') continue;

    if (item.kind === 'word') {
      const head = cleanRad(item.target);
      const ex = cleanRad(item.example);
      const segments = [head, ex].filter(Boolean);
      pushTrack({
        id: `radio:item:${item.id}`,
        kind: 'word',
        badge: isWeak ? `弱词 (${item.status})` : '词卡',
        title: head,
        text: segments.join(' — '),
        segments,
        subtext: cleanRad(item.definitionEn || item.meaningZh || item.cue || ''),
        audioUrl: cleanRad(item.audioUrl || ''),
        priority: item.status === 'N' ? 1 : item.status === 'V' ? 2 : 6
      });
    } else if (item.kind === 'sentence') {
      const sent = cleanRad(item.text);
      pushTrack({
        id: `radio:item:${item.id}`,
        kind: item.module === 'listening' ? 'listening' : 'sentence',
        badge: item.module === 'listening' ? '听力句' : '地道例句',
        title: item.module === 'listening' ? 'Listening Sentence' : 'Context Sentence',
        text: sent,
        segments: [sent],
        subtext: cleanRad(item.source || ''),
        audioUrl: cleanRad(item.audioUrl || ''),
        priority: isWeak ? 2 : 7
      });
    }
  }

  // 3. Speeches (split into natural sentences)
  if (channel !== 'weak_sniper') {
    for (const sp of (Array.isArray(speeches) ? speeches : [])) {
      if (!inScope(sp)) continue;
      const sentences = cleanRad(sp?.scriptEn)
        .split(/(?<=[.!?])\s+/)
        .map(s => s.trim())
        .filter(s => s.length >= 16)
        .slice(0, 6);
      sentences.forEach((sent, idx) => {
        pushTrack({
          id: `radio:speech:${sp.id}:${idx + 1}`,
          kind: 'speech',
          badge: `演讲片段 ${idx + 1}`,
          title: cleanRad(sp.title) || 'Speech',
          text: sent,
          segments: [sent],
          subtext: cleanRad(sp.authorOrSpeaker || 'Speech Chamber'),
          priority: 8
        });
      });
    }
  }

  // Fallback for weak_sniper when learner has 0 errors yet
  if (channel === 'weak_sniper' && tracks.length === 0) {
    return buildRadioPlaylist({
      channel: 'today_full',
      scope,
      activePackId,
      shuffle,
      items,
      vocabularyPractice,
      vocabularyAttempts,
      speeches
    }).slice(0, 15);
  }

  if (shuffle) {
    for (let i = tracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tracks[i], tracks[j]] = [tracks[j], tracks[i]];
    }
  } else {
    tracks.sort((a, b) => a.priority - b.priority);
  }
  return tracks;
}

/**
 * Formats passive radio exposure summary for honest Battle Report logging.
 */
export function summarizeRadioExposure(radioLog = {}) {
  return {
    clipsPlayed: Math.max(0, Number(radioLog?.clipsPlayed || 0)),
    activeSeconds: Math.max(0, Math.round(Number(radioLog?.activeMs || 0) / 1000)),
    channelUsed: cleanRad(radioLog?.lastChannel || ''),
    exposureOnly: true,
    countsAsMasteryK: false
  };
}


/**
 * Bundles multiple radio tracks into compact long-form podcast episodes (<= maxChars each)
 * so an entire channel (e.g. all 16 YouTube speeches or all 13 Notebook clips) synthesizes
 * in ONE single Gemini TTS request (1 RPD) and caches permanently in IndexedDB.
 */
export function buildRadioPodcastEpisodes(tracks = [], { channel = '', maxChars = 3600 } = {}) {
  const list = Array.isArray(tracks) ? tracks.filter(t => t && cleanRad(t.text)) : [];
  if (!list.length) return [];
  const chMeta = RADIO_CHANNELS.find(c => c.id === channel);
  const chLabel = chMeta ? chMeta.label : '随身播客';
  const episodes = [];
  let bucket = [];
  let bucketText = '';

  const flush = () => {
    if (!bucket.length) return;
    const epNum = episodes.length + 1;
    const words = (bucketText.match(/\b[A-Za-z][A-Za-z'-]*\b/g) || []).length;
    const estimatedMinutes = Math.max(1, Math.round((words / 145) * 10) / 10);
    episodes.push({
      id: `podcast:${channel || 'mix'}:ep${epNum}`,
      badge: `🎙️ 整集播客 · 第 ${epNum} 集`,
      title: `${chLabel}（合集 ${bucket.length} 条 · 仅耗 1 次额度）`,
      text: bucketText.trim(),
      trackCount: bucket.length,
      estimatedMinutes,
      tracksIncluded: bucket.map(t => ({
        id: t.id,
        title: t.title,
        text: t.text,
        subtext: t.subtext || '',
        sourceUrl: t.sourceUrl || ''
      })),
      exposureOnly: true
    });
    bucket = [];
    bucketText = '';
  };

  for (const track of list) {
    const cleanBody = cleanRad(track.text);
    const piece = cleanBody.endsWith('.') || cleanBody.endsWith('!') || cleanBody.endsWith('?')
      ? cleanBody
      : `${cleanBody}.`;
    const candidate = bucketText ? `${bucketText}\n\n... ${piece}` : piece;
    if (bucket.length && candidate.length > maxChars) {
      flush();
      bucket.push(track);
      bucketText = piece;
    } else {
      bucket.push(track);
      bucketText = candidate;
    }
  }
  flush();
  return episodes;
}


export function createRadioPlaybackClock() {
  let activeMs = 0;
  let clipsPlayed = 0;
  let runningSince = 0;
  let lastChannel = '';
  return {
    onPlaybackStarted(now = Date.now(), { clips = 0, channel = '' } = {}) {
      const ts = Number(now) || Date.now();
      if (!runningSince) runningSince = ts;
      const addClips = Math.max(0, Number(clips) || 0);
      if (addClips > 0) clipsPlayed += addClips;
      if (channel) lastChannel = String(channel);
    },
    onPlaybackPausedOrStopped(now = Date.now()) {
      const ts = Number(now) || Date.now();
      if (runningSince > 0) {
        activeMs += Math.max(0, ts - runningSince);
        runningSince = 0;
      }
    },
    snapshot(now = Date.now()) {
      const ts = Number(now) || Date.now();
      const extra = runningSince > 0 ? Math.max(0, ts - runningSince) : 0;
      return { clipsPlayed, activeMs: activeMs + extra, lastChannel };
    },
    reset() {
      activeMs = 0;
      clipsPlayed = 0;
      runningSince = 0;
      lastChannel = '';
    }
  };
}
