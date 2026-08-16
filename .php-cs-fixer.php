<?php

$finder = PhpCsFixer\Finder::create()
    ->in([
        __DIR__ . '/api',
    ]);

$config = new PhpCsFixer\Config();
return $config
    ->setRules([
        '@PSR12' => true,
        'array_syntax' => ['syntax' => 'short'],
        'strict_param' => true,
        'declare_strict_types' => true,
        'no_unused_imports' => true,
    ])
    ->setFinder($finder);
