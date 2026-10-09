<link rel="stylesheet" href="<?php p($_['stylesheet']); ?>">
<div id="live-tracker-app" class="live-tracker-shell">
    <div class="app-navigation">
        <nav id="app-navigation" class="app-navigation__content" aria-label="Trackers">
            <div class="live-tracker-sidebar-header">
                <h2>Trackers</h2>
                <div id="live-tracker-sidebar-actions" class="live-tracker-sidebar-actions"></div>
            </div>
            <div id="live-tracker-list" class="live-tracker-list"></div>
        </nav>
        <div class="app-navigation-toggle-wrapper">
            <button id="live-tracker-sidebar-toggle" class="app-navigation-toggle" type="button" aria-label="Trackers"
                aria-controls="app-navigation" aria-expanded="false" title="Trackers"></button>
        </div>
    </div>
    <div id="app-content">
        <div id="live-tracker-map" data-config="<?php p($_['config']); ?>" data-routes="<?php p($_['routes']); ?>"
            data-trackers="<?php p($_['trackers']); ?>" data-request="<?php p($_['request']); ?>"
            data-worker="<?php p($_['worker']); ?>"></div>
    </div>
</div>
<?php script('live_tracker', 'index'); ?>