import { Pipe, PipeTransform } from '@angular/core';

export interface TechIconInfo {
    icon: string;
    label: string;
    color?: string;
}

// Map of technology names to devicon classes
const TECH_ICON_MAP: Record<string, string> = {
    // Languages
    'typescript': 'devicon-typescript-plain colored',
    'javascript': 'devicon-javascript-plain colored',
    'python': 'devicon-python-plain colored',
    'java': 'devicon-java-plain colored',
    'csharp': 'devicon-csharp-plain colored',
    'c#': 'devicon-csharp-plain colored',
    'go': 'devicon-go-plain colored',
    'golang': 'devicon-go-plain colored',
    'rust': 'devicon-rust-original',
    'ruby': 'devicon-ruby-plain colored',
    'php': 'devicon-php-plain colored',
    'swift': 'devicon-swift-plain colored',
    'kotlin': 'devicon-kotlin-plain colored',
    'scala': 'devicon-scala-plain colored',
    'html': 'devicon-html5-plain colored',
    'css': 'devicon-css3-plain colored',
    'scss': 'devicon-sass-original colored',
    'sass': 'devicon-sass-original colored',
    'sql': 'devicon-azuresqldatabase-plain colored',

    // Frameworks
    'angular': 'devicon-angular-plain',  // Color forced via CSS due to devicon issues
    'react': 'devicon-react-original colored',
    'vue': 'devicon-vuejs-plain colored',
    'vuejs': 'devicon-vuejs-plain colored',
    'svelte': 'devicon-svelte-plain colored',
    'nextjs': 'devicon-nextjs-plain',
    'next.js': 'devicon-nextjs-plain',
    'nuxtjs': 'devicon-nuxtjs-plain colored',
    'nuxt.js': 'devicon-nuxtjs-plain colored',
    'express': 'devicon-express-original',
    'expressjs': 'devicon-express-original',
    'nestjs': 'devicon-nestjs-original colored',
    'fastify': 'devicon-fastify-plain',
    'django': 'devicon-django-plain',
    'flask': 'devicon-flask-original',
    'fastapi': 'devicon-fastapi-plain colored',
    'spring': 'devicon-spring-original colored',
    'springboot': 'devicon-spring-original colored',
    'rails': 'devicon-rails-plain colored',
    'laravel': 'devicon-laravel-original colored',
    'dotnet': 'devicon-dotnetcore-plain colored',
    '.net': 'devicon-dotnetcore-plain colored',
    'asp.net': 'devicon-dotnetcore-plain colored',

    // Databases
    'postgresql': 'devicon-postgresql-plain colored',
    'postgres': 'devicon-postgresql-plain colored',
    'mysql': 'devicon-mysql-original colored',
    'mongodb': 'devicon-mongodb-plain colored',
    'mongo': 'devicon-mongodb-plain colored',
    'redis': 'devicon-redis-plain colored',
    'sqlite': 'devicon-sqlite-plain colored',
    'mariadb': 'devicon-mariadb-original colored',
    'oracle': 'devicon-oracle-original colored',
    'dynamodb': 'devicon-dynamodb-plain colored',
    'cassandra': 'devicon-cassandra-plain colored',
    'elasticsearch': 'devicon-elasticsearch-plain colored',
    'neo4j': 'devicon-neo4j-plain colored',

    // ORM / DB Tools
    'sequelize': 'devicon-sequelize-plain colored',
    'prisma': 'devicon-prisma-original',
    'typeorm': 'devicon-typescript-plain colored',
    'mongoose': 'devicon-mongodb-plain colored',
    'hibernate': 'devicon-hibernate-plain colored',

    // Test Frameworks
    'jest': 'devicon-jest-plain colored',
    'mocha': 'devicon-mocha-plain colored',
    'jasmine': 'devicon-jasmine-original colored',
    'karma': 'devicon-karma-plain colored',
    'cypress': 'devicon-cypressio-plain',
    'playwright': 'devicon-playwright-plain colored',
    'pytest': 'devicon-pytest-plain colored',
    'junit': 'devicon-junit-plain colored',
    'vitest': 'devicon-vitest-plain colored',

    // Build / Package Tools
    'webpack': 'devicon-webpack-plain colored',
    'vite': 'devicon-vitejs-plain colored',
    'rollup': 'devicon-rollup-plain colored',
    'esbuild': 'devicon-esbuild-original colored',
    'npm': 'devicon-npm-original-wordmark colored',
    'yarn': 'devicon-yarn-plain colored',
    'pnpm': 'devicon-pnpm-plain colored',
    'gradle': 'devicon-gradle-original colored',
    'maven': 'devicon-maven-plain colored',
    'pip': 'devicon-python-plain colored',

    // DevOps / Cloud
    'docker': 'devicon-docker-plain colored',
    'kubernetes': 'devicon-kubernetes-plain colored',
    'k8s': 'devicon-kubernetes-plain colored',
    'aws': 'devicon-amazonwebservices-plain-wordmark colored',
    'azure': 'devicon-azure-plain colored',
    'gcp': 'devicon-googlecloud-plain colored',
    'terraform': 'devicon-terraform-plain colored',
    'ansible': 'devicon-ansible-plain colored',

    // Version Control / CI
    'git': 'devicon-git-plain colored',
    'github': 'devicon-github-original',
    'gitlab': 'devicon-gitlab-plain colored',
    'bitbucket': 'devicon-bitbucket-original colored',
    'jenkins': 'devicon-jenkins-plain colored',
    'circleci': 'devicon-circleci-plain colored',
    'travisci': 'devicon-travis-plain colored',

    // Other Tools
    'eslint': 'devicon-eslint-original colored',
    'prettier': 'devicon-prettier-plain colored',
    'babel': 'devicon-babel-plain colored',
    'nginx': 'devicon-nginx-original colored',
    'apache': 'devicon-apache-plain colored',
    'graphql': 'devicon-graphql-plain colored',
    'nodejs': 'devicon-nodejs-plain colored',
    'node': 'devicon-nodejs-plain colored',
    'deno': 'devicon-denojs-original colored',
    'bun': 'devicon-bun-plain colored',
};

@Pipe({
    name: 'techIcon',
    standalone: true
})
export class TechIconPipe implements PipeTransform {
    transform(tech: string): TechIconInfo {
        const normalized = tech.toLowerCase().trim();
        const icon = TECH_ICON_MAP[normalized];

        return {
            icon: icon || '',
            label: tech
        };
    }
}

/**
 * Helper function for use in components
 */
export function getTechIcon(tech: string): string {
    const normalized = tech.toLowerCase().trim();
    return TECH_ICON_MAP[normalized] || '';
}

export function hasTechIcon(tech: string): boolean {
    const normalized = tech.toLowerCase().trim();
    return normalized in TECH_ICON_MAP;
}
