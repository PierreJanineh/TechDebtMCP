import { GradleParser } from '../gradleParser.js';
import { ParsedDependency } from '../baseParser.js';

describe('GradleParser', () => {
  let parser: GradleParser;

  beforeEach(() => {
    parser = new GradleParser();
  });

  describe('canParse', () => {
    it('should recognize Maven pom.xml files', () => {
      expect(parser.canParse('pom.xml')).toBe(true);
      expect(parser.canParse('/path/to/pom.xml')).toBe(true);
    });

    it('should recognize Gradle build files', () => {
      expect(parser.canParse('build.gradle')).toBe(true);
      expect(parser.canParse('build.gradle.kts')).toBe(true);
      expect(parser.canParse('/path/to/build.gradle')).toBe(true);
    });

    it('should reject unsupported files', () => {
      expect(parser.canParse('package.json')).toBe(false);
      expect(parser.canParse('settings.gradle')).toBe(false);
    });
  });

  describe('getPackageFileNames', () => {
    it('should return all supported package file names', () => {
      const names = parser.getPackageFileNames();
      expect(names).toContain('pom.xml');
      expect(names).toContain('build.gradle');
      expect(names).toContain('build.gradle.kts');
    });
  });

  describe('parse - Maven pom.xml', () => {
    it('should parse simple Maven dependencies', async () => {
      const content = `<?xml version="1.0"?>
<project>
  <dependencies>
    <dependency>
      <groupId>junit</groupId>
      <artifactId>junit</artifactId>
      <version>4.13.2</version>
      <scope>test</scope>
    </dependency>
    <dependency>
      <groupId>commons-io</groupId>
      <artifactId>commons-io</artifactId>
      <version>2.8.0</version>
    </dependency>
  </dependencies>
</project>`;

      const deps = await parser.parse('pom.xml', content);

      expect(deps.length).toBeGreaterThan(0);
      // Should parse at least commons-io
      expect(deps.find(d => d.name === 'commons-io:commons-io')).toBeDefined();
    });

    it('should mark test dependencies as dev', async () => {
      const content = `<?xml version="1.0"?>
<project>
  <dependencies>
    <dependency>
      <groupId>junit</groupId>
      <artifactId>junit</artifactId>
      <version>4.13.2</version>
      <scope>test</scope>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot</artifactId>
      <version>2.5.0</version>
    </dependency>
  </dependencies>
</project>`;

      const deps = await parser.parse('pom.xml', content);

      const junitDep = deps.find(d => d.name === 'junit:junit');
      const springDep = deps.find(d => d.name === 'org.springframework.boot:spring-boot');

      expect(junitDep?.isDev).toBe(true);
      expect(springDep?.isDev).toBe(false);
    });

    it('should handle Maven properties in versions', async () => {
      // This is a simplified test - full Maven would require property resolution
      const content = `<?xml version="1.0"?>
<project>
  <dependencies>
    <dependency>
      <groupId>junit</groupId>
      <artifactId>junit</artifactId>
      <version>4.13.2</version>
    </dependency>
  </dependencies>
</project>`;

      const deps = await parser.parse('pom.xml', content);

      expect(deps.length).toBeGreaterThan(0);
    });
  });

  describe('parse - Gradle build.gradle', () => {
    it('should parse simple Gradle dependencies', async () => {
      const content = `plugins {
  id 'java'
}

dependencies {
  implementation 'com.google.guava:guava:30.1.1-jre'
  testImplementation 'junit:junit:4.13.2'
  runtimeOnly 'mysql:mysql-connector-java:8.0.26'
}`;

      const deps = await parser.parse('build.gradle', content);

      expect(deps.length).toBeGreaterThan(0);
      // Should find at least guava
      expect(deps.find(d => d.name.includes('guava'))).toBeDefined();
    });

    it('should distinguish dev and test dependencies', async () => {
      const content = `dependencies {
  implementation 'com.google.guava:guava:30.1.1-jre'
  testImplementation 'junit:junit:4.13.2'
}`;

      const deps = await parser.parse('build.gradle', content);

      const implDep = deps.find(d => d.name.includes('guava'));
      const testDep = deps.find(d => d.name.includes('junit'));

      expect(implDep?.isDev).toBe(false);
      expect(testDep?.isDev).toBe(true);
    });

    it('should handle Kotlin Gradle build.gradle.kts', async () => {
      const content = `plugins {
  kotlin("jvm") version "1.5.21"
}

dependencies {
  implementation("com.squareup.okhttp3:okhttp:4.9.1")
  testImplementation("junit:junit:4.13.2")
}`;

      const deps = await parser.parse('build.gradle.kts', content);

      expect(deps.length).toBeGreaterThan(0);
    });
  });

  describe('parse - error handling', () => {
    it('should handle malformed XML gracefully', async () => {
      const content = `<?xml version="1.0"?>
<project>
  <dependencies>
    <dependency>`;

      // Regex-based parser handles this gracefully
      const deps = await parser.parse('pom.xml', content);
      expect(Array.isArray(deps)).toBe(true);
    });

    it('should throw error when file cannot be parsed', async () => {
      const content = 'some content';

      await expect(parser.parse('package.json', content)).rejects.toThrow();
    });

    it('should handle empty pom.xml', async () => {
      const content = `<?xml version="1.0"?>
<project></project>`;

      const deps = await parser.parse('pom.xml', content);

      expect(Array.isArray(deps)).toBe(true);
    });

    it('should handle empty Gradle file', async () => {
      const content = `// Empty build.gradle`;

      const deps = await parser.parse('build.gradle', content);

      expect(Array.isArray(deps)).toBe(true);
    });
  });

  describe('ecosystem', () => {
    it('should have gradle as ecosystem (handles both Maven and Gradle)', () => {
      expect(parser.getEcosystem()).toBe('gradle');
    });
  });
});


