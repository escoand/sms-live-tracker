<?php

return [
    'routes' => [
        ['name' => 'page#index', 'url' => '/', 'verb' => 'GET'],
        ['name' => 'page#config', 'url' => '/config', 'verb' => 'GET'],
        ['name' => 'page#trackers', 'url' => '/trackers', 'verb' => 'GET'],
        ['name' => 'page#routes', 'url' => '/routes', 'verb' => 'GET'],
        ['name' => 'page#request', 'url' => '/request', 'verb' => 'POST'],
        ['name' => 'page#receive', 'url' => '/receive/{backend}/{token}', 'verb' => 'POST'],
        ['name' => 'page#save', 'url' => '/settings', 'verb' => 'POST'],
    ],
];