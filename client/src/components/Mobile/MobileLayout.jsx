import MobileNav from './MobileNav';
import MobileDashboard from './MobileDashboard';
import MobileGlobe from './MobileGlobe';
import MobileChat from './MobileChat';
import MobileProfile from './MobileProfile';

export default function MobileLayout({
  mobileTab, setMobileTab, t,
  myNode, lifespan, isOfflineMode, offlineState, globalStats,
  socket, logs, chatInput, setChatInput, addLog,
  ping, nodes, currentEvent, bgStyle, setBgStyle,
  theme, themes, setTheme, bgmEnabled, toggleBgm,
  notificationEnabled, setNotificationEnabled,
  boundDiscord, myRole, honor, weeklyScore, region,
  onLogout, onOpenShop, onOpenBackpack, onOpenAchievements,
  onOpenTalent, onOpenLeaderboard, onOpenWar, onOpenAbout,
  onOpenAccountInfo, onOpenDiscordBind, onOpenSocial,
  pmData, onClosePm, language, setLanguage
}) {
  const renderTab = () => {
    switch (mobileTab) {
      case 'dashboard':
        return (
          <MobileDashboard
            myNode={myNode}
            lifespan={lifespan}
            isOfflineMode={isOfflineMode}
            offlineState={offlineState}
            globalStats={globalStats}
            onOpenShop={onOpenShop}
            onOpenBackpack={onOpenBackpack}
            onOpenAchievements={onOpenAchievements}
            onOpenTalent={onOpenTalent}
            onOpenLeaderboard={onOpenLeaderboard}
            onOpenWar={onOpenWar}
            onOpenAbout={onOpenAbout}
            t={t}
          />
        );
      case 'globe':
        return (
          <MobileGlobe
            lifespan={lifespan}
            myNode={myNode}
            ping={ping}
            globalStats={globalStats}
            region={region}
            onOpenSocial={onOpenSocial}
            onOpenAchievements={onOpenAchievements}
            honor={honor}
            weeklyScore={weeklyScore}
            bgStyle={bgStyle}
            currentEvent={currentEvent}
            nodes={nodes}
            logs={logs}
            chatInput={chatInput}
            setChatInput={setChatInput}
            socket={socket}
            pmData={pmData}
            onClosePm={onClosePm}
            t={t}
          />
        );
      case 'chat':
        return (
          <MobileChat
            logs={logs}
            chatInput={chatInput}
            setChatInput={setChatInput}
            socket={socket}
            addLog={addLog}
            t={t}
          />
        );
      case 'profile':
        return (
          <MobileProfile
            myNode={myNode}
            myRole={myRole}
            boundDiscord={boundDiscord}
            theme={theme}
            themes={themes}
            setTheme={setTheme}
            bgStyle={bgStyle}
            setBgStyle={setBgStyle}
            bgmEnabled={bgmEnabled}
            toggleBgm={toggleBgm}
            notificationEnabled={notificationEnabled}
            setNotificationEnabled={setNotificationEnabled}
            isOfflineMode={isOfflineMode}
            offlineState={offlineState}
            onLogout={onLogout}
            onOpenAccountInfo={onOpenAccountInfo}
            onOpenDiscordBind={onOpenDiscordBind}
            t={t}
            language={language}
            setLanguage={setLanguage}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="mobile-layout">
      <div className="mobile-content">
        {renderTab()}
      </div>
      <MobileNav activeTab={mobileTab} onTabChange={setMobileTab} />
    </div>
  );
}
